import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

/**
 * Componente Text customizado que desabilita o escalonamento de fonte do sistema
 * 
 * Use este componente em vez de Text do React Native para garantir
 * que o tamanho da fonte não seja afetado pelas configurações de acessibilidade do sistema.
 * 
 * @example
 * <AppText style={styles.title}>Título</AppText>
 */
const AppText = React.forwardRef((props, ref) => {
    return (
        <RNText
            ref={ref}
            {...props}
            allowFontScaling={false}
        />
    );
});

AppText.displayName = 'AppText';

export default AppText;


