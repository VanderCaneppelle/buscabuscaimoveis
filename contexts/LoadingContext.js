import React, { createContext, useContext, useState } from 'react';
import BBLoading from '../components/BBLoading';

const LoadingContext = createContext();

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading deve ser usado dentro de LoadingProvider');
    }
    return context;
};

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);

    const showLoading = () => setIsLoading(true);
    const hideLoading = () => setIsLoading(false);

    const withLoading = async (asyncFunction) => {
        try {
            showLoading();
            const result = await asyncFunction();
            return result;
        } finally {
            hideLoading();
        }
    };

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading, withLoading }}>
            {children}
            <BBLoading visible={isLoading} />
        </LoadingContext.Provider>
    );
}; 