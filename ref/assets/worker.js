export default {
    async fetch(req) {
        if (req.method !== "POST") {
            return new Response("Not found", { status: 404 });
        }

        const body = await req.json();

        const gcPayload = {
            path: body.path,
            referrer: body.referrer,
            title: body.title
        };

        await fetch("https://proceduralrulesmith.goatcounter.com/count", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(gcPayload)
        });

        return new Response(null, { status: 204 });
    }
};
