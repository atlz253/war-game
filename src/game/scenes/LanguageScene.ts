import Phaser from "phaser";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { refreshLocales, saveLocale } from "../localization/dev-locale-api";
import { createLocale, LocaleDraft } from "../localization/draft";
import { localeErrorMessage } from "../localization/errors";
import {
  getLocaleCatalog,
  getLocaleId,
  onLocaleCatalogChange,
  selectLocale,
  t,
} from "../localization/runtime";
import { Button } from "../ui/components/Button";
import { CanvasTextDialog } from "../ui/components/CanvasTextDialog";
import { localizationUi as ui } from "../ui/theme/localization-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import type { MainMenuSceneData } from "./MainMenuScene";
import { LANGUAGE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

const CENTER_ORIGIN = 0.5;

export class LanguageScene extends Phaser.Scene {
  public content!: Phaser.GameObjects.Container;
  private menuData: MainMenuSceneData = {};
  private draft?: LocaleDraft;
  private creating = false;
  private page = 0;
  private message = "";
  private dialog?: CanvasTextDialog;
  private saving = false;
  private generation = 0;
  private active = false;
  private confirming = false;
  public constructor() {
    super(LANGUAGE_SCENE_KEY);
  }
  public create(data: MainMenuSceneData & { editLocaleId?: string } = {}): void {
    if (data.editLocaleId && !import.meta.env.DEV) {
      this.scene.start(LANGUAGE_SCENE_KEY, {});
      return;
    }
    this.menuData = data;
    this.draft = undefined;
    this.creating = false;
    this.confirming = false;
    this.message = "";
    this.page = 0;
    this.saving = false;
    this.active = true;
    this.generation++;
    this.content = this.add.container().setScrollFactor(0);
    this.cameras.main.setBackgroundColor(uiTheme.colors.background);
    if (data.editLocaleId) this.openEditor(data.editLocaleId);
    else this.render();
    const unsubscribe = onLocaleCatalogChange(() => this.catalogChanged());
    this.scale.on("resize", this.resize, this);
    this.events.once("shutdown", () => {
      this.active = false;
      this.generation++;
      this.dialog?.destroy();
      this.dialog = undefined;
      unsubscribe();
      this.scale.off("resize", this.resize, this);
    });
  }
  private render(): void {
    if (this.dialog) return;
    this.content.removeAll(true);
    this.text(ui.centerX, ui.titleY, this.draft?.value.name ?? t("language.title"), true);
    this.text(ui.centerX, ui.statusY, this.message);
    if (this.draft) this.renderEditor();
    else this.renderSelector();
    this.resize();
  }
  private text(x: number, y: number, value: string, title = false): void {
    this.content.add(
      this.add
        .text(x, y, value, {
          color: uiTheme.colors.text,
          fontFamily: uiTheme.font.family,
          fontSize: title ? uiTheme.font.titleSize : uiTheme.font.smallSize,
          wordWrap: { width: ui.textWidth, useAdvancedWrap: true },
          align: "center",
        })
        .setOrigin(CENTER_ORIGIN, 0),
    );
  }
  private button(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    enabled = true,
    width: number = ui.controlWidth,
  ): void {
    this.content.add(
      new Button(this, { x, y, width, height: ui.buttonHeight, label, enabled, onClick }).container,
    );
  }
  private renderSelector(): void {
    const catalog = getLocaleCatalog();
    if (!this.message && catalog.diagnostics.length)
      this.text(ui.centerX, ui.statusY, catalog.diagnostics.join("\n"));
    const locales = catalog.locales.slice(this.page * ui.rows, (this.page + 1) * ui.rows);
    locales.forEach((locale, index) => {
      this.button(
        ui.centerX,
        ui.rowsY + index * ui.rowHeight,
        locale.name,
        () => {
          this.message = selectLocale(locale.id) ? "" : t("language.storageFailure");
          this.render();
        },
        true,
        ui.rowButtonWidth,
      );
    });
    this.navigation(catalog.locales.length);
    this.button(ui.backX, ui.bottomY, t("common.back"), () =>
      this.scene.start(MAIN_MENU_SCENE_KEY, this.menuData),
    );
    if (import.meta.env.DEV) {
      this.button(ui.createX, ui.bottomY, t("language.create"), () => this.createLanguage());
      this.button(ui.editX, ui.bottomY, t("language.edit"), () => this.openEditor(getLocaleId()));
    }
  }
  private renderEditor(): void {
    const value = this.draft!.value;
    const english = getLocaleCatalog().locales.find((locale) => locale.id === "en")!;
    const keys = Object.keys(value.id === "en" ? value.strings : english.strings).sort();
    keys.slice(this.page * ui.rows, (this.page + 1) * ui.rows).forEach((key, index) => {
      const y = ui.rowsY + index * ui.rowHeight;
      const translation = value.strings[key];
      const source = english.strings[key] ?? value.strings[key] ?? "";
      this.button(
        ui.leftX,
        y,
        key,
        () => this.editText(key, translation ?? "", (text) => this.draft!.edit(key, text)),
        true,
        ui.rowButtonWidth,
      );
      this.dictionaryPreview(y, source, translation);
    });
    this.navigation(keys.length);
    if (this.confirming) {
      this.button(ui.backX, ui.bottomY, t("common.save"), () => void this.save(true), !this.saving);
      this.button(ui.createX, ui.bottomY, t("common.discard"), () => {
        this.draft!.discard();
        this.leaveEditor();
      });
      this.button(ui.editX, ui.bottomY, t("common.cancel"), () => {
        this.confirming = false;
        this.message = "";
        this.render();
      });
      return;
    }
    this.button(ui.backX, ui.bottomY, t("common.back"), () => this.requestLeave(), !this.saving);
    this.button(ui.createX, ui.bottomY, t("common.save"), () => void this.save(), !this.saving);
    this.button(ui.editX, ui.bottomY, t("language.rename"), () =>
      this.editText(t("language.name"), value.name, (name) => this.draft!.rename(name)),
    );
    if (value.id === "en")
      this.button(ui.centerX, ui.statusY + ui.rowHeight / 2, t("language.addKey"), () =>
        this.addKey(),
      );
  }
  private dictionaryPreview(y: number, source: string, translation: string | undefined): void {
    const text = this.add
      .text(ui.rightX, y - ui.buttonHeight / 2, "", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: uiTheme.font.smallSize,
        wordWrap: { width: ui.rowButtonWidth, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(CENTER_ORIGIN, 0)
      .setInteractive({ useHandCursor: true });
    const preview = [source, translation?.trim() ? translation : t("language.fallback")]
      .map((value) => text.getWrappedText(value).slice(0, ui.maxNameRows).join("\n"))
      .join("\n");
    text.setText(preview);
    text.on(
      "pointerdown",
      (_pointer: unknown, _x: number, _y: number, event?: Phaser.Types.Input.EventData) => {
        event?.stopPropagation();
        this.editText(t("language.viewSource"), source, () => {});
      },
    );
    this.content.add(text);
  }
  private navigation(count: number): void {
    this.button(
      ui.leftX,
      ui.navigationY,
      t("common.previous"),
      () => {
        this.page--;
        this.render();
      },
      this.page > 0,
    );
    this.button(
      ui.rightX,
      ui.navigationY,
      t("common.next"),
      () => {
        this.page++;
        this.render();
      },
      (this.page + 1) * ui.rows < count,
    );
  }
  private openEditor(id: string): void {
    if (!import.meta.env.DEV) return;
    const locales = getLocaleCatalog().locales;
    const value = locales.find((locale) => locale.id === id);
    if (!value) return;
    this.draft = new LocaleDraft(value, locales.find((locale) => locale.id === "en")!);
    this.page = 0;
    this.render();
  }
  private createLanguage(): void {
    this.editText(t("language.id"), "", (id) => {
      const locales = getLocaleCatalog().locales;
      this.draft = new LocaleDraft(
        createLocale(id, id, locales),
        locales.find((locale) => locale.id === "en")!,
      );
      this.creating = true;
      this.page = 0;
    });
  }
  private addKey(): void {
    this.editText(t("language.key"), "", (key) => {
      queueMicrotask(() => {
        if (this.active)
          this.editText(t("language.value"), "", (value) => this.draft!.addKey(key, value));
      });
    });
  }
  private editText(label: string, value: string, confirm: (value: string) => void): void {
    this.dialog = new CanvasTextDialog(
      this,
      label,
      value,
      true,
      (text) => {
        try {
          confirm(text);
          this.message = "";
        } catch (error) {
          this.message = localeErrorMessage(error);
        }
      },
      () => {
        this.dialog?.destroy();
        this.dialog = undefined;
        this.render();
      },
    );
    this.content.add(this.dialog.container);
  }
  private requestLeave(): void {
    if (this.draft?.dirty || this.creating) {
      this.confirming = true;
      this.message = t("language.unsaved");
      this.render();
    } else this.leaveEditor();
  }
  private leaveEditor(): void {
    this.draft = undefined;
    this.confirming = false;
    this.creating = false;
    this.page = 0;
    this.message = "";
    this.render();
  }
  private async save(leave = false): Promise<void> {
    if (!import.meta.env.DEV || this.saving || !this.draft) return;
    const draft = this.draft;
    const snapshot = draft.value;
    const generation = this.generation;
    this.saving = true;
    this.render();
    try {
      await saveLocale(snapshot, this.creating);
      if (!this.active || generation !== this.generation) return;
      draft.saved(snapshot);
      this.creating = false;
      await refreshLocales();
      if (!this.active || generation !== this.generation) return;
      this.message = t("language.saved");
      if (leave && !draft.dirty) this.leaveEditor();
    } catch (error) {
      if (this.active && generation === this.generation) this.message = localeErrorMessage(error);
    } finally {
      if (this.active && generation === this.generation) {
        this.saving = false;
        this.render();
      }
    }
  }
  private catalogChanged(): void {
    if (!this.active) return;
    if (this.dialog) {
      this.message = t("language.externalChange");
      return;
    }
    const catalog = getLocaleCatalog();
    if (this.draft && !this.saving) {
      const value = catalog.locales.find((locale) => locale.id === this.draft!.value.id);
      if (value) this.draft.refresh(value, catalog.locales.find((locale) => locale.id === "en")!);
      if (this.draft.externalChange) this.message = t("language.externalChange");
    }
    this.render();
  }
  private resize(): void {
    const viewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.content.setPosition(viewport.contentX, viewport.contentY).setScale(viewport.scale);
  }
}
