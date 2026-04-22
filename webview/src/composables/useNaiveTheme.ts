import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { darkTheme } from 'naive-ui';

function isDarkBodyClass() {
  return (
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast') ||
    document.body.classList.contains('vscode-high-contrast-light')
  );
}

export function useNaiveTheme() {
  const isDark = ref(typeof document !== 'undefined' ? isDarkBodyClass() : false);
  const tokens = ref({
    sidebarBackground: '#252526',
    foreground: '#cccccc',
    secondaryForeground: '#9d9d9d',
    border: '#3c3c3c',
    buttonBackground: '#0e639c',
    buttonHoverBackground: '#1177bb',
    focusBorder: '#007fd4',
    inputBackground: '#3c3c3c',
    inputPlaceholder: '#8c8c8c',
    error: '#f14c4c',
    warning: '#cca700',
    info: '#3794ff',
    success: '#89d185',
    fontFamily: 'var(--vscode-font-family)',
    fontFamilyMono: 'var(--vscode-editor-font-family, var(--vscode-font-family))'
  });
  let observer: MutationObserver | null = null;

  const syncTheme = () => {
    isDark.value = isDarkBodyClass();
    const styles = getComputedStyle(document.body);

    tokens.value = {
      sidebarBackground: readToken(styles, '--vscode-sideBar-background', '#252526'),
      foreground: readToken(styles, '--vscode-foreground', '#cccccc'),
      secondaryForeground: readToken(styles, '--vscode-descriptionForeground', '#9d9d9d'),
      border: readToken(styles, '--vscode-panel-border', '#3c3c3c'),
      buttonBackground: readToken(styles, '--vscode-button-background', '#0e639c'),
      buttonHoverBackground: readToken(styles, '--vscode-button-hoverBackground', '#1177bb'),
      focusBorder: readToken(styles, '--vscode-focusBorder', '#007fd4'),
      inputBackground: readToken(styles, '--vscode-input-background', '#3c3c3c'),
      inputPlaceholder: readToken(
        styles,
        '--vscode-input-placeholderForeground',
        readToken(styles, '--vscode-descriptionForeground', '#8c8c8c')
      ),
      error: readToken(styles, '--vscode-errorForeground', '#f14c4c'),
      warning: readToken(styles, '--vscode-editorWarning-foreground', '#cca700'),
      info: readToken(styles, '--vscode-focusBorder', '#3794ff'),
      success: readToken(styles, '--vscode-testing-iconPassed', '#89d185'),
      fontFamily: readToken(styles, '--vscode-font-family', 'sans-serif'),
      fontFamilyMono: readToken(styles, '--vscode-editor-font-family', 'monospace')
    };
  };

  onMounted(() => {
    syncTheme();
    observer = new MutationObserver(syncTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  });

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  const themeOverrides = computed(() => ({
    common: {
      bodyColor: tokens.value.sidebarBackground,
      cardColor: tokens.value.sidebarBackground,
      popoverColor: tokens.value.sidebarBackground,
      modalColor: tokens.value.sidebarBackground,
      borderColor: tokens.value.border,
      primaryColor: tokens.value.buttonBackground,
      primaryColorHover: tokens.value.buttonHoverBackground,
      primaryColorPressed: tokens.value.buttonBackground,
      primaryColorSuppl: tokens.value.focusBorder,
      textColorBase: tokens.value.foreground,
      textColor1: tokens.value.foreground,
      textColor2: tokens.value.secondaryForeground,
      textColor3: tokens.value.secondaryForeground,
      inputColor: tokens.value.inputBackground,
      inputColorDisabled: tokens.value.inputBackground,
      placeholderColor: tokens.value.inputPlaceholder,
      errorColor: tokens.value.error,
      warningColor: tokens.value.warning,
      infoColor: tokens.value.info,
      successColor: tokens.value.success,
      fontFamily: tokens.value.fontFamily,
      fontFamilyMono: tokens.value.fontFamilyMono,
      borderRadius: '4px',
      borderRadiusSmall: '4px'
    }
  }));

  const theme = computed(() => (isDark.value ? darkTheme : null));

  return {
    theme,
    themeOverrides
  };
}

function readToken(styles: CSSStyleDeclaration, tokenName: string, fallback: string) {
  const value = styles.getPropertyValue(tokenName).trim();
  return value || fallback;
}
