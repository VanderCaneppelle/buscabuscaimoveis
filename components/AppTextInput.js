import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';

/**
 * Componente TextInput customizado que desabilita o escalonamento de fonte do sistema
 * 
 * Use este componente em vez de TextInput do React Native para garantir
 * que o tamanho da fonte não seja afetado pelas configurações de acessibilidade do sistema.
 * 
 * @example
 * <AppTextInput 
 *   style={styles.input}
 *   value={value}
 *   onChangeText={onChangeText}
 * />
 */
const AppTextInput = React.forwardRef((props, ref) => {
    return (
        <RNTextInput
            ref={ref}
            {...props}
            allowFontScaling={false}
        />
    );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;








