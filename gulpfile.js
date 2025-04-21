'use strict';

const { src, dest } = require('gulp');

function copyWebFiles() {
    return src(['app/**/*.html', 'app/**/*.css', 'app/**/*.js'])
        .pipe(dest('dist'));
}

// ✅ Solo copiar archivos web estáticos
exports.build = copyWebFiles;

