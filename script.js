document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // 1) CONFIG (EDITA AQUI)
    // =========================
    const MAPBOX_TOKEN = "pk.eyJ1IjoiZ2Vja29saXZlciIsImEiOiJjbWtwemVuNm0wbmNtM2dzZTcwbHhhMnFtIn0.9aJG3761SyXS-H5GkAtstA";
    const SUPABASE_URL = "https://nqkekpwjzjdjtufwdbls.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2VrcHdqempkanR1ZndkYmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU0NDgsImV4cCI6MjA4NDY5MTQ0OH0.IoZlKpXR4o1sIZRi_DoyFdh3HUQa1VsclmzCLrYMiMA";

    // Centro inicial do mapa (Maia / Porto como default)
    const DEFAULT_CENTER = { lng: -8.621, lat: 41.2279 };
    const DEFAULT_ZOOM = 12.5;

    // =========================
    // 2) MOBILE MENU
    // =========================
    const menuBtn = document.querySelector(".mobile-menu-btn");
    const mobileMenu = document.querySelector(".mobile-menu");

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("active");

            const icon = menuBtn.querySelector("i");
            if (mobileMenu.classList.contains("active")) {
                icon.classList.replace("ph-list", "ph-x");
            } else {
                icon.classList.replace("ph-x", "ph-list");
            }
        });

        mobileMenu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                mobileMenu.classList.remove("active");
                const icon = menuBtn.querySelector("i");
                icon.classList.replace("ph-x", "ph-list");
            });
        });
    }

    // =========================
    // 3) SUPABASE CLIENT
    // =========================
    const supabase =
        window.supabase?.createClient && SUPABASE_URL && SUPABASE_ANON_KEY
            ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
            : null;

    // =========================
    // 4) MAPBOX INIT
    // =========================
    const mapEl = document.getElementById("map");
    const cardStreet = document.getElementById("cardStreet");
    const cardText = document.getElementById("cardText");

    if (!mapEl) {
        console.warn("Elemento #map não encontrado.");
    } else if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes("COLOCA_AQUI")) {
        console.warn("Define o MAPBOX_TOKEN no script.js");
        if (cardText) cardText.textContent = "Falta configurar o MAPBOX_TOKEN.";
    } else {
        // eslint-disable-next-line no-undef
        mapboxgl.accessToken = MAPBOX_TOKEN;

        // eslint-disable-next-line no-undef
        const map = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/mapbox/streets-v12",
            center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
            zoom: DEFAULT_ZOOM,
        });

        // Controls
        // eslint-disable-next-line no-undef
        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Estado interno de markers para refresh
        let currentMarkers = [];

        function clearMarkers() {
            currentMarkers.forEach((m) => m.remove());
            currentMarkers = [];
        }

        function severityToColor(severity) {
            const s = String(severity || "").toLowerCase();
            if (s === "high") return "#EF4444";   // vermelho
            if (s === "medium") return "#F59E0B"; // laranja
            return "#10B981";                     // verde (low/default)
        }

        function statusLabel(status) {
            const s = String(status || "").toLowerCase();
            if (s === "in_progress") return "Em progresso";
            if (s === "resolved") return "Resolvido";
            return "Aberto";
        }

        function escapeHtml(str) {
            return String(str ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }

        function buildPopup(p) {
            const title = escapeHtml(p.title || "Ocorrência");
            const desc = escapeHtml(p.description || "");
            const sev = escapeHtml(p.severity || "low");
            const st = escapeHtml(statusLabel(p.status || "open"));

            return `
        <div>
          <div class="popup-title">${title}</div>
          <div class="popup-meta">${desc}</div>
          <div class="popup-badge">Severidade: ${sev} • Estado: ${st}</div>
        </div>
      `;
        }

        async function loadPotholes() {
            if (!supabase) {
                if (cardText) cardText.textContent = "Supabase não configurado (URL/ANON KEY).";
                return;
            }

            try {
                if (cardText) cardText.textContent = "A carregar ocorrências do Supabase...";

                const { data, error } = await supabase
                    .from("potholes")
                    .select("id, created_at, title, description, severity, status, lat, lng")
                    .order("created_at", { ascending: false });

                if (error) throw error;

                clearMarkers();

                const rows = Array.isArray(data) ? data : [];
                if (rows.length === 0) {
                    if (cardText) cardText.textContent = "Sem ocorrências ainda.";
                    return;
                }

                // Atualiza card com a última ocorrência (a mais recente)
                const latest = rows[0];
                if (cardStreet) cardStreet.textContent = "Ocorrências";
                if (cardText) cardText.textContent = `${rows.length} registo(s) carregado(s).`;

                // Para ajustar o mapa aos markers
                // eslint-disable-next-line no-undef
                const bounds = new mapboxgl.LngLatBounds();

                rows.forEach((p) => {
                    const lat = Number(p.lat);
                    const lng = Number(p.lng);

                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                    const el = document.createElement("div");
                    el.style.width = "18px";
                    el.style.height = "18px";
                    el.style.borderRadius = "999px";
                    el.style.border = "3px solid white";
                    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
                    el.style.background = severityToColor(p.severity);
                    el.style.cursor = "pointer";

                    // eslint-disable-next-line no-undef
                    const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(buildPopup(p));

                    // eslint-disable-next-line no-undef
                    const marker = new mapboxgl.Marker({ element: el })
                        .setLngLat([lng, lat])
                        .setPopup(popup)
                        .addTo(map);

                    el.addEventListener("click", () => {
                        if (cardStreet) cardStreet.textContent = "Selecionado";
                        if (cardText) cardText.textContent = `${p.title || "Ocorrência"} • ${statusLabel(p.status)} • ${p.severity || "low"}`;
                    });

                    currentMarkers.push(marker);
                    bounds.extend([lng, lat]);
                });

                // Ajusta vista (se houver pelo menos 1 marker válido)
                if (!bounds.isEmpty()) {
                    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 900 });
                }
            } catch (err) {
                console.error("Erro ao carregar potholes:", err);
                if (cardText) cardText.textContent = "Erro a carregar ocorrências (ver consola).";
            }
        }

        map.on("load", () => {
            loadPotholes();

            // Realtime opcional (se tiveres Realtime ligado no Supabase para a tabela)
            // Faz refresh leve quando houver mudanças.
            if (supabase?.channel) {
                supabase
                    .channel("potholes-realtime")
                    .on(
                        "postgres_changes",
                        { event: "*", schema: "public", table: "potholes" },
                        () => loadPotholes()
                    )
                    .subscribe();
            }
        });
    }

    // =========================
    // 5) FORM (mantém simulação + preparado para gravar)
    // =========================
    const form = document.getElementById("leadForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;

            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
            btn.disabled = true;
            btn.style.opacity = "0.7";

            try {
                // Se quiseres gravar leads no Supabase:
                // 1) cria uma tabela "leads" no Supabase
                // 2) descomenta este bloco
                if (supabase) {
                    const payload = {
                        name: document.getElementById("name")?.value?.trim() || null,
                        email: document.getElementById("email")?.value?.trim() || null,
                        org: document.getElementById("org")?.value?.trim() || null,
                        role: document.getElementById("role")?.value?.trim() || null,
                        message: document.getElementById("message")?.value?.trim() || null,
                    };

                    // Se ainda não existir a tabela leads, isto pode dar erro — e seguimos igual com a simulação.
                    await supabase.from("leads").insert([payload]);
                }
            } catch (err) {
                // Não bloqueia o fluxo — é só uma landing/teste.
                console.warn("Não foi possível gravar lead no Supabase (ok em fase de teste):", err);
            }

            setTimeout(() => {
                btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> Pedido Enviado!';
                btn.style.backgroundColor = "var(--accent)";

                alert(
                    "Obrigado pelo seu interesse!\n\nRecebemos os seus dados e a nossa equipa entrará em contacto em breve para agendar a demonstração do piloto."
                );

                form.reset();

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.backgroundColor = "";
                }, 3000);
            }, 900);
        });
    }
});
