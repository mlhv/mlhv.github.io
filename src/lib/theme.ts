export const resolveTheme = (stored: 'light' | 'dark' | null, systemPrefersDark: boolean): 'light' | 'dark' => {
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
    
    return systemPrefersDark ? 'dark' : 'light';
};