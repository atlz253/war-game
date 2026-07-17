export interface UiTheme {
  colors: {
    background: number;
    panel: number;
    panelBorder: number;
    primary: number;
    danger: number;
    text: string;
    mutedText: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  font: {
    family: string;
    smallSize: number;
    normalSize: number;
    titleSize: number;
  };
}
