document.addEventListener("DOMContentLoaded", () => {
    // ====== CONFIG (preencher) ======
    const SUPABASE_URL = "https://nqkekpwjzjdjtufwdbls.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2VrcHdqempkanR1ZndkYmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU0NDgsImV4cCI6MjA4NDY5MTQ0OH0.IoZlKpXR4o1sIZRi_DoyFdh3HUQa1VsclmzCLrYMiMA";
    const MAPBOX_TOKEN = "pk.eyJ1IjoiZ2Vja29saXZlciIsImEiOiJjbWtwemVuNm0wbmNtM2dzZTcwbHhhMnFtIn0.9aJG3761SyXS-H5GkAtstA";

    // ====== BASIC UI: mobile menu ======
    const menuBtn = document.querySelector(".mobile-menu-btn");
    const mobileMenu = document.querySelector(".mobile-menu");

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("active");
            const icon = menuBtn.querySelector("i");
            if (mobileMenu.classList.contains("active")) icon.classList.replace("ph-list", "ph-x");
            else icon.classList.replace("ph-x", "ph-list");
        });

        mobileMenu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                mobileMenu.classList.remove("active");
                const icon = menuBtn.querySelector("i");
                icon.classList.replace("ph-x", "ph-list");
            });
        });
    }

    // ====== Supabase client ======
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ====== Mapbox init ======
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-8.621, 41.227], // Maia (default)
        zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // UI refs
    const mapCardBody = document.getElementById("mapCardBody");

    // Auth buttons (desktop/mobile)
    const btnAuth = document.getElementById("btnAuth");
    const btnAuthMobile = document.getElementById("btnAuthMobile");
    const btnNewOccurrence = document.getElementById("btnNewOccurrence");
    const btnNewOccurrenceMobile = document.getElementById("btnNewOccurrenceMobile");

    // ====== AUTH MODAL ======
    const authModal = document.getElementById("authModal");
    const authBackdrop = document.getElementById("authBackdrop");
    const authClose = document.getElementById("authClose");
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const authForm = document.getElementById("authForm");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authSubmit = document.getElementById("authSubmit");
    const authError = document.getElementById("authError");

    let authMode = "login"; // "login" | "signup"

    function openAuthModal() {
        authError.classList.add("hidden");
        authError.textContent = "";
        authModal.classList.remove("hidden");
    }
    function closeAuthModal() {
        authModal.classList.add("hidden");
    }
    function setAuthMode(mode) {
        authMode = mode;
        if (mode === "login") {
            tabLogin.classList.add("active");
            tabSignup.classList.remove("active");
            authSubmit.textContent = "Entrar";
            document.getElementById("authTitle").textContent = "Entrar";
        } else {
            tabSignup.classList.add("active");
            tabLogin.classList.remove("active");
            authSubmit.textContent = "Criar conta";
            document.getElementById("authTitle").textContent = "Criar conta";
        }
    }

    [btnAuth, btnAuthMobile].forEach((b) => b && b.addEventListener("click", openAuthModal));
    authBackdrop.addEventListener("click", closeAuthModal);
    authClose.addEventListener("click", closeAuthModal);
    tabLogin.addEventListener("click", () => setAuthMode("login"));
    tabSignup.addEventListener("click", () => setAuthMode("signup"));

    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authError.classList.add("hidden");
        authError.textContent = "";

        const email = authEmail.value.trim();
        const password = authPassword.value;

        try {
            if (authMode === "signup") {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                closeAuthModal();
                alert("Conta criada. Confirma o email (se estiver ativo) e faz login.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                closeAuthModal();
            }
        } catch (err) {
            authError.textContent = err?.message || "Erro ao autenticar.";
            authError.classList.remove("hidden");
        }
    });

    // ====== OCCURRENCE MODAL ======
    const occModal = document.getElementById("occModal");
    const occBackdrop = document.getElementById("occBackdrop");
    const occClose = document.getElementById("occClose");

    const occForm = document.getElementById("occForm");
    const occTitleInput = document.getElementById("occTitleInput");
    const occDescInput = document.getElementById("occDescInput");
    const occSeverity = document.getElementById("occSeverity");
    const occAddress = document.getElementById("occAddress");
    const occArea = document.getElementById("occArea");
    const occLat = document.getElementById("occLat");
    const occLng = document.getElementById("occLng");
    const occError = document.getElementById("occError");

    const btnPickOnMap = document.getElementById("btnPickOnMap");
    const btnUseMyLocation = document.getElementById("btnUseMyLocation");

    let pickMode = false;
    let pickMarker = null;

    function openOccModal() {
        occError.classList.add("hidden");
        occError.textContent = "";

        // reset
        occForm.reset();
        occAddress.value = "";
        occArea.value = "";
        occLat.value = "";
        occLng.value = "";

        if (pickMarker) {
            pickMarker.remove();
            pickMarker = null;
        }

        pickMode = true; // por defeito, já pode clicar no mapa
        occModal.classList.remove("hidden");
        mapCardBody.textContent = "Modo seleção: clica no mapa para escolher a posição.";
    }

    function closeOccModal() {
        pickMode = false;
        occModal.classList.add("hidden");
        mapCardBody.textContent = "Clica num ponto para ver detalhes.";
    }

    [btnNewOccurrence, btnNewOccurrenceMobile].forEach((b) => b && b.addEventListener("click", openOccModal));
    occBackdrop.addEventListener("click", closeOccModal);
    occClose.addEventListener("click", closeOccModal);

    btnPickOnMap.addEventListener("click", () => {
        pickMode = true;
        mapCardBody.textContent = "Modo seleção: clica no mapa para escolher a posição.";
    });

    // Reverse geocoding (Mapbox)
    async function reverseGeocode(lng, lat) {
        const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
            `?types=address,poi,place,locality,neighborhood&language=pt&access_token=${MAPBOX_TOKEN}`;

        const res = await fetch(url);
        if (!res.ok) return { address: "", area: "" };

        const data = await res.json();
        const feature = data?.features?.[0];
        const address = feature?.place_name || "";

        // tentar extrair “zona” (bairro/localidade/cidade)
        // Mapbox devolve context com vários níveis
        let area = "";
        const ctx = feature?.context || [];

        const neighborhood = ctx.find((c) => (c?.id || "").startsWith("neighborhood."));
        const locality = ctx.find((c) => (c?.id || "").startsWith("locality."));
        const place = ctx.find((c) => (c?.id || "").startsWith("place."));

        area = neighborhood?.text || locality?.text || place?.text || "";

        // fallback: se feature for "place", usa o próprio texto
        if (!area && feature?.place_type?.includes("place")) area = feature?.text || "";

        return { address, area };
    }

    async function setPickedPoint(lng, lat) {
        occLat.value = String(lat);
        occLng.value = String(lng);

        if (pickMarker) pickMarker.remove();
        pickMarker = new mapboxgl.Marker({ color: "#111827" }).setLngLat([lng, lat]).addTo(map);

        const { address, area } = await reverseGeocode(lng, lat);
        occAddress.value = address;
        occArea.value = area;

        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
    }

    map.on("click", async (e) => {
        if (!pickMode) return;
        await setPickedPoint(e.lngLat.lng, e.lngLat.lat);
        mapCardBody.textContent = "Posição definida. Preenche o resto e guarda a ocorrência.";
    });

    // GPS button
    btnUseMyLocation.addEventListener("click", () => {
        if (!navigator.geolocation) {
            occError.textContent = "O teu browser não suporta geolocalização.";
            occError.classList.remove("hidden");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                await setPickedPoint(lng, lat);
                occError.classList.add("hidden");
                occError.textContent = "";
            },
            (err) => {
                occError.textContent =
                    err?.code === 1
                        ? "Permissão de localização recusada."
                        : "Não foi possível obter a tua localização.";
                occError.classList.remove("hidden");
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    });

    // ====== Load potholes and render markers ======
    const markers = new Map(); // id -> Marker

    function severityColor(sev) {
        if (sev === "high") return "#ef4444";
        if (sev === "medium") return "#f59e0b";
        return "#10b981";
    }

    function renderPotholeMarker(row) {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "999px";
        el.style.background = severityColor(row.severity);
        el.style.border = "2px solid #ffffff";
        el.style.boxShadow = "0 6px 14px rgba(0,0,0,0.20)";
        el.style.cursor = "pointer";

        const m = new mapboxgl.Marker({ element: el })
            .setLngLat([row.lng, row.lat])
            .addTo(map);

        el.addEventListener("click", () => {
            map.flyTo({ center: [row.lng, row.lat], zoom: Math.max(map.getZoom(), 14) });
            mapCardBody.textContent = `${row.title} • ${row.status || "open"} • ${row.severity}`;
        });

        markers.set(row.id, m);
    }

    async function loadPotholes() {
        const { data, error } = await supabase.from("potholes").select("*").order("created_at", { ascending: false });
        if (error) {
            console.warn("Erro ao carregar potholes:", error.message);
            return;
        }

        // clear existing
        markers.forEach((m) => m.remove());
        markers.clear();

        (data || []).forEach(renderPotholeMarker);
    }

    // ====== Create pothole (requires auth + RLS) ======
    occForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        occError.classList.add("hidden");
        occError.textContent = "";

        const title = occTitleInput.value.trim();
        const description = occDescInput.value.trim();
        const severity = occSeverity.value;

        const lat = parseFloat(occLat.value);
        const lng = parseFloat(occLng.value);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            occError.textContent = "Escolhe uma posição no mapa (ou usa a tua localização) antes de guardar.";
            occError.classList.remove("hidden");
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            occError.textContent = "Tens de fazer login para criar uma ocorrência.";
            occError.classList.remove("hidden");
            return;
        }

        const payload = {
            title,
            description,
            severity,
            status: "open",
            lat,
            lng,
            address: (occAddress.value || null),
            area: (occArea.value || null),
            user_id: user.id,
        };

        const { error } = await supabase.from("potholes").insert(payload);
        if (error) {
            occError.textContent = error.message || "Erro ao gravar ocorrência.";
            occError.classList.remove("hidden");
            return;
        }

        closeOccModal();
        await loadPotholes();
    });

    // ====== Auth state -> UI ======
    async function refreshAuthUI() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const label = user?.email ? user.email : "Entrar";

        if (btnAuth) btnAuth.textContent = label;
        if (btnAuthMobile) btnAuthMobile.textContent = label;

        // mostrar “Nova ocorrência” só com login
        const showNew = Boolean(user);
        [btnNewOccurrence, btnNewOccurrenceMobile].forEach((b) => {
            if (!b) return;
            b.classList.toggle("hidden", !showNew);
        });

        // se já está logado, clicar no botão mostra opção de logout simples
        const attachLogout = (button) => {
            if (!button) return;
            button.onclick = async () => {
                const {
                    data: { user: u },
                } = await supabase.auth.getUser();

                if (!u) return openAuthModal();

                const ok = confirm(`Sair da conta ${u.email}?`);
                if (!ok) return;

                await supabase.auth.signOut();
                await refreshAuthUI();
            };
        };

        attachLogout(btnAuth);
        attachLogout(btnAuthMobile);
    }

    supabase.auth.onAuthStateChange(async () => {
        await refreshAuthUI();
    });

    // ====== Lead form (mantém o teu fluxo) ======
    const form = document.getElementById("leadForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;

            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
            btn.disabled = true;
            btn.style.opacity = "0.7";

            // Se tiveres tabela "leads" no Supabase, podes gravar aqui (opcional)
            try {
                const name = form.querySelector('input[name="name"]').value.trim();
                const email = form.querySelector('input[name="email"]').value.trim();
                const message = form.querySelector('textarea[name="message"]').value.trim();

                // exemplo (descomenta se tiveres tabela leads):
                // await supabase.from("leads").insert({ name, email, message });

                void name; void email; void message;
            } catch (err) {
                console.warn("Lead submit warning:", err);
            }

            setTimeout(() => {
                btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> Pedido Enviado!';
                btn.style.backgroundColor = "var(--accent)";
                alert("Obrigado pelo seu interesse!\n\nRecebemos os seus dados e a nossa equipa entrará em contacto em breve.");
                form.reset();

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.backgroundColor = "";
                }, 2500);
            }, 700);
        });
    }

    // ====== Boot ======
    (async () => {
        await refreshAuthUI();
        map.on("load", loadPotholes);
    })();
});
