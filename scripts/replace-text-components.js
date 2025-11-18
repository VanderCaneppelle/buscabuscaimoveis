#!/usr/bin/env node

/**
 * Script para substituir Text e TextInput do React Native
 * pelos componentes customizados AppText e AppTextInput
 * que desabilitam o escalonamento de fonte do sistema.
 * 
 * Uso:
 * node scripts/replace-text-components.js
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Função recursiva para encontrar arquivos
function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        // Ignorar diretórios específicos
        if (stat.isDirectory()) {
            if (!['node_modules', 'dist', 'build', '.expo'].includes(file)) {
                findFiles(filePath, fileList);
            }
        } else if (stat.isFile()) {
            // Processar apenas arquivos JavaScript/TypeScript
            if (/\.(js|jsx|ts|tsx)$/.test(file)) {
                fileList.push(filePath);
            }
        }
    });
    
    return fileList;
}

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Verificar se já importa AppText ou AppTextInput
    const hasAppTextImport = content.includes('AppText');
    const hasAppTextInputImport = content.includes('AppTextInput');

    // Substituir importações
    if (content.includes("from 'react-native'") || content.includes('from "react-native"')) {
        // Adicionar imports de AppText e AppTextInput se não existirem
        if (!hasAppTextImport && (content.includes('<Text') || content.includes('Text,'))) {
            // Adicionar import de AppText
            const importMatch = content.match(/(import\s+{[^}]*Text[^}]*}\s+from\s+['"]react-native['"])/);
            if (importMatch) {
                // Remover Text do import do react-native
                content = content.replace(importMatch[0], importMatch[0].replace(/\s*Text\s*,?/, ''));
                // Adicionar import de AppText
                const appTextImport = "import AppText from './AppText';";
                // Tentar adicionar após outros imports locais ou antes do primeiro import do react-native
                const lastImportMatch = content.match(/(import\s+.*from\s+['"].*['"];?\s*\n)/g);
                if (lastImportMatch) {
                    const lastImport = lastImportMatch[lastImportMatch.length - 1];
                    const lastImportIndex = content.lastIndexOf(lastImport);
                    content = content.slice(0, lastImportIndex + lastImport.length) + 
                              appTextImport + '\n' + 
                              content.slice(lastImportIndex + lastImport.length);
                } else {
                    content = appTextImport + '\n' + content;
                }
                modified = true;
            }
        }

        if (!hasAppTextInputImport && (content.includes('<TextInput') || content.includes('TextInput,'))) {
            // Adicionar import de AppTextInput
            const importMatch = content.match(/(import\s+{[^}]*TextInput[^}]*}\s+from\s+['"]react-native['"])/);
            if (importMatch) {
                // Remover TextInput do import do react-native
                content = content.replace(importMatch[0], importMatch[0].replace(/\s*TextInput\s*,?/, ''));
                // Adicionar import de AppTextInput
                const appTextInputImport = "import AppTextInput from './AppTextInput';";
                const lastImportMatch = content.match(/(import\s+.*from\s+['"].*['"];?\s*\n)/g);
                if (lastImportMatch) {
                    const lastImport = lastImportMatch[lastImportMatch.length - 1];
                    const lastImportIndex = content.lastIndexOf(lastImport);
                    content = content.slice(0, lastImportIndex + lastImport.length) + 
                              appTextInputImport + '\n' + 
                              content.slice(lastImportIndex + lastImport.length);
                } else {
                    content = appTextInputImport + '\n' + content;
                }
                modified = true;
            }
        }
    }

    // Substituir <Text por <AppText (mas não <AppText)
    if (content.includes('<Text') && !content.includes('AppText')) {
        content = content.replace(/<Text\b/g, '<AppText');
        content = content.replace(/<\/Text>/g, '</AppText>');
        modified = true;
    }

    // Substituir <TextInput por <AppTextInput (mas não <AppTextInput)
    if (content.includes('<TextInput') && !content.includes('AppTextInput')) {
        content = content.replace(/<TextInput\b/g, '<AppTextInput');
        content = content.replace(/<\/TextInput>/g, '</AppTextInput>');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Atualizado: ${filePath}`);
        return true;
    }

    return false;
}

function main() {
    console.log('🔄 Iniciando substituição de Text e TextInput...\n');

    if (!fs.existsSync(COMPONENTS_DIR)) {
        console.error(`❌ Diretório não encontrado: ${COMPONENTS_DIR}`);
        process.exit(1);
    }

    const files = findFiles(COMPONENTS_DIR);
    let modifiedFiles = 0;

    files.forEach(file => {
        if (replaceInFile(file)) {
            modifiedFiles++;
        }
    });

    console.log(`\n✅ Concluído!`);
    console.log(`   Total de arquivos processados: ${files.length}`);
    console.log(`   Arquivos modificados: ${modifiedFiles}`);
    console.log(`\n⚠️  IMPORTANTE: Revise os arquivos modificados antes de commitar!`);
    console.log(`   Alguns casos podem precisar de ajuste manual.`);
}

if (require.main === module) {
    main();
}

module.exports = { replaceInFile };

