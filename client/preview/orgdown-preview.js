// Runs inside every built-in Markdown preview. The Orgdown preview document
// carries a hidden marker element; when it is present we add a body class so
// the contributed styles (orgdown-preview.css) only affect Orgdown previews
// and never regular Markdown previews.
//
// The built-in preview does not put the Markdown body in the initial HTML:
// it ships it in the `data-initial-md-content` attribute of the
// `vscode-markdown-preview-data` meta element and injects it into the DOM
// later (on DOMContentLoaded). Contributed preview scripts are plain `async`
// scripts, so they usually run *before* that injection happens. Checking the
// DOM alone would therefore miss the marker on first load. We fall back to the
// meta attribute until the body has actually been rendered, and re-check on
// every content update.
(function () {
  function hasRenderedBody() {
    return document.querySelector('.markdown-body') !== null;
  }

  function hasMarker() {
    if (hasRenderedBody()) {
      return document.getElementById('orgdown-preview-marker') !== null;
    }
    var meta = document.getElementById('vscode-markdown-preview-data');
    var initial = meta && meta.getAttribute('data-initial-md-content');
    return !!initial && initial.indexOf('orgdown-preview-marker') !== -1;
  }

  function syncBodyClass() {
    document.body.classList.toggle('orgdown-preview', hasMarker());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncBodyClass);
  } else {
    syncBodyClass();
  }

  window.addEventListener('vscode.markdown.updateContent', syncBodyClass);
})();
