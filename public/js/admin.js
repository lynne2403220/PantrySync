(function () {
    const refresh = document.querySelector('[data-admin-refresh]');
    if (refresh) {
        refresh.addEventListener('click', () => window.location.reload());
    }
})();
