var showdown = require('showdown');
var remote = require('electron').remote;
var ipc = require('electron').ipcRenderer;
var dialog = require('electron').remote.dialog;
var fs = remote.require('fs');
const storage = require('electron-json-storage');
var console = require('console');
var parsePath = require("parse-filepath");
var katex = require('parse-katex');
var currentFile = '';
var isFileLoadedInitially = false;

const config = require('./config');

var buildEditorContextMenu = remote.require('electron-editor-context-menu');
var currentValue = 0,
    currentValueTheme = 0;

window.addEventListener('contextmenu', e => {
    if (!e.target.closest('textarea, input, [contenteditable="true"],section')) return;

    var menu = buildEditorContextMenu();

    setTimeout(() => {
        menu.popup(remote.getCurrentWindow());
    }, 30);
});

var cm = CodeMirror.fromTextArea(document.getElementById("plainText"), {
    lineNumbers: false,
    mode: "markdown",
    viewportMargin: 100000000000,
    lineWrapping: true,
    autoCloseBrackets: true
});

$(() => {
    var plainText = document.getElementById('plainText'),
        markdownArea = document.getElementById('markdown');

    cm.on('change', (cMirror) => {
        var markdownText = cMirror.getValue();
        markdownText = replaceWithEmojis(markdownText);
        latexText = katex.renderLaTeX(markdownText);

        marked.setOptions({
            highlight: (code) => {
                return require('highlightjs').highlightAuto(code).value;
            }
        });

        html = marked(latexText, {
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false
        });

        markdownArea.innerHTML = html;

        converter = new showdown.Converter();
        html = converter.makeHtml(markdownText);
        document.getElementById("htmlPreview").value = html;

        if (this.isFileLoadedInitially) {
            this.setClean();
            this.isFileLoadedInitially = false;
        }

        if (this.currentFile != '') {
            this.updateWindowTitle(this.currentFile);
        } else {
            this.updateWindowTitle();
        }

    });

    storage.get('markdown-savefile', (error, data) => {
        if (error) throw error;

        if ('filename' in data) {
            fs.readFile(data.filename, 'utf-8', (err, data) => {
                if (err) {
                    alert("An error ocurred while opening the file " + err.message)
                }
                cm.getDoc().setValue(data);
            });
            this.isFileLoadedInitially = true;
            this.currentFile = data.filename;
        }
    });

    var $prev = $('#previewPanel'),
        $markdown = $('#markdown'),
        $syncScroll = $('#syncScroll'),
        canScroll;

    var toggleSyncScroll = () => {
        console.log('Toggle scroll synchronization.');
        canScroll = $syncScroll.is(':checked');

        config.set('isSyncScroll', canScroll);
        if (canScroll) $(window).trigger('resize');
    }
    
    $syncScroll.on('change', toggleSyncScroll);

    const isSyncScroll = config.get('isSyncScroll');
    if (isSyncScroll === true) {
        $syncScroll.attr('checked', true);
    } else {
        $syncScroll.attr('checked', false);
    }

    var codeScrollable = () => {
        var info = cm.getScrollInfo(),
            fullHeight = info.height,
            viewHeight = info.clientHeight;

        return fullHeight - viewHeight;
    }

    var prevScrollable = () => {
        var fullHeight = $markdown.height(),
            viewHeight = $prev.height();
        return fullHeight - viewHeight;
    }


    var muteScroll = (obj, listener) => {
        obj.off('scroll', listener);
        obj.on('scroll', tempHandler);

        var tempHandler = () => {
            obj.off('scroll', tempHandler);
            obj.on('scroll', listener);
        }
    }

    var codeScroll = () => {
        var scrollable = codeScrollable();
        if (scrollable > 0 && canScroll) {
            var percent = cm.getScrollInfo().top / scrollable;

            console.log('Code scroll: %' + (Math.round(100 * percent)));
            muteScroll($prev, prevScroll);
            $prev.scrollTop(percent * prevScrollable());
        }
    }
    cm.on('scroll', codeScroll);
    $(window).on('resize', codeScroll);

    var prevScroll = () => {
        var scrollable = prevScrollable();
        if (scrollable > 0 && canScroll) {
            var percent = $(this).scrollTop() / scrollable;

            muteScroll(cm, codeScroll);
            cm.scrollTo(null, codeScrollable() * percent);
        }
    }
    $prev.on('scroll', prevScroll);

    const isDarkMode = config.get('darkMode');
    changeTheme(isDarkMode);

    const isHtml = config.get('isHtml');
    clkPref(isHtml);
});
