(function () {
    const payload = {
        path: location.pathname,
        referrer: document.referrer || null,
        title: document.title
    };

    fetch("/_stats", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
    }).catch(() => { });
})();