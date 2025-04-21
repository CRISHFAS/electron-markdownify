'use strict';

const fs = require('fs');
const { src, dest, series, parallel } = require('gulp');
const packager = require('electron-packager');

const config = JSON.parse(fs.readFileSync('package.json'));
const appVersion = config.version;
const electronVersion = config.devDependencies['electron'].match(/[\d.]+/)[0];
const options = {
    asar: true,
    dir: '.',
    icon: './app/img/markdownify.icns',
    name: 'Markdownify',
    out: 'dist',
    overwrite: true,
    prune: true,
    version: electronVersion,
    'app-version': appVersion
};

function buildOSX(done) {
    options.arch = 'x64';
    options.platform = 'darwin';
    options['app-bundle-id'] = 'com.amitmerchant.markdownify';
    options['helper-bundle-id'] = 'com.amitmerchant.markdownify.helper';

    packager(options, (err, paths) => {
        if (err) {
            console.error(err);
        }
        done();
    });
}

function buildLinux(done) {
    // @TODO: Implementar la lógica para Linux si es necesario
    done();
}

function buildWindows(done) {
    options.arch = 'x64';
    options.platform = 'win32';

    packager(options, (err, paths) => {
        if (err) {
            console.error(err);
        }
        done();
    });
}

// ✅ Definir la tarea `build` correctamente en Gulp 4
exports.build = parallel(buildOSX, buildLinux, buildWindows);
