document.addEventListener("DOMContentLoaded", () => {
    // ====== CONFIG ======
    const SUPABASE_URL = "https://nqkekpwjzjdjtufwdbls.supabase.co";
    const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2VrcHdqempkanR1ZndkYmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU0NDgsImV4cCI6MjA4NDY5MTQ0OH0.IoZlKpXR4o1sIZRi_DoyFdh3HUQa1VsclmzCLrYMiMA";
    const MAPBOX_TOKEN =
        "pk.eyJ1IjoiZ2Vja29saXZlciIsImEiOiJjbWtwemVuNm0wbmNtM2dzZTcwbHhhMnFtIn0.9aJG3761SyXS-H5GkAtstA";

    // ====== DEMO POINTS (fallback) ======
    const DEMO_POTHOLES = [
        {
            id: "demo-1",
            title: "Buraco na Rua do Mosteiro",
            description: "Perto da passadeira. Atenção de noite.",
            severity: "high",
            status: "open",
            lat: 41.23465,
            lng: -8.61955,
            address: "Rua do Mosteiro, Maia",
            area: "Maia",
            created_at: new Date().toISOString(),
        },
        {
            id: "demo-2",
            title: "Afundamento junto à rotunda",
            description: "Risco para motos e bicicletas.",
            severity: "medium",
            status: "open",
            lat: 41.23662,
            lng: -8.61412,
            address: "Avenida Visconde Barreiros, Maia",
            area: "Maia",
            created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
            id: "demo-3",
            title: "Fissuras no asfalto",
            description: "Dá para reparar antes de piorar.",
            severity: "low",
            status: "open",
            lat: 41.24005,
            lng: -8.61395,
            address: "Rua Central de Vermoim",
            area: "Vermoim",
            created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
    ];

    // ====== Helpers ======
    function severityLabel(sev) {
        if (sev === "high") return "Alta";
        if (sev === "medium") return "Média";
        return "Baixa";
    }

    function severityColor(sev) {
        if (sev === "high") return "#ef4444";
        if (sev === "medium") return "#f59e0b";
        return "#10b981";
    }

    function escapeHtml(str) {
        return (str || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function issueOrderValue(sev) {
        if (sev === "high") return 3;
        if (sev === "medium") return 2;
        return 1;
    }

    function formatDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
    }

    // ====== DOM ======
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Mobile menu
    const menuBtn = document.querySelector(".mobile-menu-btn");
    const mobileMenu = document.querySelector(".mobile-menu");
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener("click", () => {
            mobileMenu.style.display = mobileMenu.style.display === "block" ? "none" : "block";
        });
    }

    // Header buttons
    const btnLogin = document.getElementById("btnLogin");
    const btnNewOccurrence = document.getElementById("btnNewOccurrence");
    const btnNewOccurrenceMobile = document.getElementById("btnNewOccurrenceMobile");
    const userBadge = document.getElementById("userBadge");

    // Map card
    const mapCardBody = document.getElementById("mapCardBody");

    // Dashboard DOM
    const dashboard = document.getElementById("dashboard");
    const issueSearch = document.getElementById("issueSearch");
    const issueSort = document.getElementById("issueSort");
    const issuesList = document.getElementById("issuesList");
    const issuesEmpty = document.getElementById("issuesEmpty");

    // Sections to hide after login
    const sectionsToHideAfterLogin = ["problema", "solucao", "funcionalidades", "beneficios"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    let cachedIssues = [];

    // ====== SUPABASE ======
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ====== AUTH MODAL ======
    const authModal = document.getElementById("authModal");
    const authBackdrop = document.getElementById("authBackdrop");
    const authClose = document.getElementById("authClose");
    const authForm = document.getElementById("authForm");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authError = document.getElementById("authError");
    const authSubmit = document.getElementById("authSubmit");
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");

    let authMode = "login";

    function openAuthModal() {
        if (!authModal) return;
        if (authError) {
            authError.classList.add("hidden");
            authError.textContent = "";
        }
        authModal.classList.remove("hidden");
    }

    function closeAuthModal() {
        if (!authModal) return;
        authModal.classList.add("hidden");
    }

    function setAuthMode(mode) {
        authMode = mode;
        if (tabLogin) tabLogin.classList.toggle("active", mode === "login");
        if (tabSignup) tabSignup.classList.toggle("active", mode === "signup");
        if (authSubmit) authSubmit.textContent = mode === "login" ? "Entrar" : "Criar conta";
    }

    [authBackdrop, authClose].forEach((el) => {
        if (el) el.addEventListener("click", closeAuthModal);
    });

    if (tabLogin) tabLogin.addEventListener("click", () => setAuthMode("login"));
    if (tabSignup) tabSignup.addEventListener("click", () => setAuthMode("signup"));

    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (authError) {
                authError.classList.add("hidden");
                authError.textContent = "";
            }
            if (authSubmit) authSubmit.disabled = true;

            const originalBtnText = authSubmit ? authSubmit.textContent : "Entrar";
            if (authSubmit) authSubmit.textContent = "A processar...";

            const email = (authEmail?.value || "").trim();
            const password = authPassword?.value || "";

            try {
                if (authMode === "signup") {
                    const { error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;

                    closeAuthModal();
                    alert("Conta criada. Se a confirmação por email estiver ativa, confirma o email e depois faz login.");
                    return;
                }

                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                closeAuthModal();
            } catch (err) {
                if (authError) {
                    authError.textContent = err?.message || "Erro ao autenticar.";
                    authError.classList.remove("hidden");
                }
            } finally {
                if (authSubmit) {
                    authSubmit.disabled = false;
                    authSubmit.textContent = originalBtnText;
                }
            }
        });
    }

    // ====== MAP ======
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-8.617, 41.235],
        zoom: 12.7,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const markers = new Map();
    let pickMode = false;
    let pickMarker = null;

    // Fix: escolher no mapa com modal por cima
    let pickForOccurrence = false;
    let pendingPickedPoint = null; // {lat,lng,address,area}

    async function getLatestPhotoUrl(potholeId) {
        // Demo não tem foto
        if (!potholeId || String(potholeId).startsWith("demo-")) return null;

        // Busca o último path na tabela pothole_photos
        const { data, error } = await supabase
            .from("pothole_photos")
            .select("path, created_at")
            .eq("pothole_id", potholeId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data?.path) return null;

        // Signed URL (funciona mesmo se bucket não for público)
        const { data: signed, error: signErr } = await supabase.storage
            .from("pothole-photos")
            .createSignedUrl(data.path, 60 * 60);

        if (signErr || !signed?.signedUrl) return null;
        return signed.signedUrl;
    }

    async function renderSelectedOccurrence(row) {
        if (!mapCardBody) return;

        mapCardBody.innerHTML = `A carregar detalhes…`;

        const title = escapeHtml(row.title);
        const desc = escapeHtml(row.description || "");
        const sev = severityLabel(row.severity);
        const status = escapeHtml(row.status || "open");

        const addr = row.address ? escapeHtml(row.address) : "—";
        const area = row.area ? escapeHtml(row.area) : "—";

        const photoUrl = await getLatestPhotoUrl(row.id);

        const photoHtml = photoUrl
            ? `<div style="margin-top:12px;">
           <img src="${photoUrl}" alt="Foto da ocorrência"
             style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid rgba(15,23,42,0.12);" />
         </div>`
            : "";

        mapCardBody.innerHTML = `
      <div style="font-weight:900">${title}</div>
      <div style="margin-top:6px; font-weight:800; color: var(--text-muted)">${sev} • ${status}</div>
      <div style="margin-top:10px; color: var(--text-muted); font-weight:700">${desc}</div>
      <div class="muted" style="margin-top:10px;">${addr}</div>
      <div class="muted">${area}</div>
      ${photoHtml}
    `;
    }

    function renderPotholeMarker(row) {
        const dot = document.createElement("div");
        dot.style.width = "14px";
        dot.style.height = "14px";
        dot.style.borderRadius = "999px";
        dot.style.background = severityColor(row.severity);
        dot.style.border = "2px solid #fff";
        dot.style.boxShadow = "0 8px 18px rgba(0,0,0,0.2)";

        const marker = new mapboxgl.Marker({ element: dot }).setLngLat([row.lng, row.lat]).addTo(map);

        marker.getElement().addEventListener("click", async () => {
            await renderSelectedOccurrence(row);
        });

        markers.set(row.id, marker);
    }

    function showDemoIfNeeded() {
        markers.forEach((m) => m.remove());
        markers.clear();
        DEMO_POTHOLES.forEach(renderPotholeMarker);

        if (issuesEmpty) {
            issuesEmpty.textContent = "Sem dados reais. A mostrar demonstração.";
            issuesEmpty.classList.remove("hidden");
        }
    }

    async function loadPotholes() {
        const { data, error } = await supabase
            .from("potholes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
            showDemoIfNeeded();
            return;
        }

        markers.forEach((m) => m.remove());
        markers.clear();
        data.forEach(renderPotholeMarker);
    }

    // ====== DASHBOARD ======
    function renderIssuesList(items) {
        if (!issuesList || !issuesEmpty) return;

        issuesList.innerHTML = "";

        if (!items || items.length === 0) {
            issuesEmpty.textContent = "Sem ocorrências abertas.";
            issuesEmpty.classList.remove("hidden");
            return;
        }

        issuesEmpty.classList.add("hidden");

        for (const row of items) {
            const el = document.createElement("div");
            el.className = "issue-item";
            el.innerHTML = `
        <div class="issue-top">
          <div class="issue-title">${escapeHtml(row.title)}</div>
          <span class="badge">${severityLabel(row.severity)}</span>
        </div>
        <div class="issue-meta">
          ${escapeHtml(row.area || "—")} • ${escapeHtml(row.address || "—")} • ${formatDate(row.created_at)}
        </div>
        <div class="issue-desc">${escapeHtml(row.description || "")}</div>
      `;

            el.addEventListener("click", async () => {
                map.flyTo({ center: [row.lng, row.lat], zoom: 16 });
                await renderSelectedOccurrence(row);
            });

            issuesList.appendChild(el);
        }
    }

    function applyIssueFiltersAndRender() {
        let items = [...cachedIssues];

        const q = (issueSearch?.value || "").trim().toLowerCase();
        if (q) {
            items = items.filter(
                (x) =>
                    (x.title || "").toLowerCase().includes(q) ||
                    (x.description || "").toLowerCase().includes(q) ||
                    (x.area || "").toLowerCase().includes(q) ||
                    (x.address || "").toLowerCase().includes(q)
            );
        }

        const sort = issueSort?.value || "newest";
        if (sort === "severity") {
            items.sort((a, b) => issueOrderValue(b.severity) - issueOrderValue(a.severity));
        } else {
            items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        renderIssuesList(items);
    }

    async function loadOpenIssuesForDashboard() {
        if (issuesEmpty) {
            issuesEmpty.textContent = "A carregar ocorrências…";
            issuesEmpty.classList.remove("hidden");
        }
        if (issuesList) issuesList.innerHTML = "";

        const { data, error } = await supabase
            .from("potholes")
            .select("*")
            .eq("status", "open")
            .order("created_at", { ascending: false });

        if (error) {
            cachedIssues = [];
            if (issuesEmpty) {
                issuesEmpty.textContent = "Erro ao carregar ocorrências abertas.";
                issuesEmpty.classList.remove("hidden");
            }
            return;
        }

        cachedIssues = data || [];
        applyIssueFiltersAndRender();
    }

    if (issueSearch) issueSearch.addEventListener("input", applyIssueFiltersAndRender);
    if (issueSort) issueSort.addEventListener("change", applyIssueFiltersAndRender);

    function scrollToDashboard() {
        if (!dashboard) return;
        dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function ensureGoDashboardButton() {
        const existing = document.getElementById("btnGoDashboard");
        if (existing) return existing;

        const headerCta = document.querySelector(".header-cta");
        if (!headerCta) return null;

        const btn = document.createElement("button");
        btn.id = "btnGoDashboard";
        btn.type = "button";
        btn.className = "btn btn-outline";
        btn.innerHTML = '<i class="ph ph-list-checks"></i> Painel';
        btn.addEventListener("click", scrollToDashboard);

        headerCta.insertBefore(btn, headerCta.firstChild);
        return btn;
    }

    // ====== OCCURRENCE MODAL ======
    const occModal = document.getElementById("occModal");
    const occBackdrop = document.getElementById("occBackdrop");
    const occClose = document.getElementById("occClose");

    const occForm = document.getElementById("occForm");
    const occTitleInput = document.getElementById("occTitleInput");
    const occDescInput = document.getElementById("occDescInput");
    const occSeverity = document.getElementById("occSeverity");
    const occPhoto = document.getElementById("occPhoto");
    const occPhotoPreview = document.getElementById("occPhotoPreview");
    const occAddress = document.getElementById("occAddress");
    const occArea = document.getElementById("occArea");
    const occLat = document.getElementById("occLat");
    const occLng = document.getElementById("occLng");
    const occError = document.getElementById("occError");
    const btnPickOnMap = document.getElementById("btnPickOnMap");
    const btnUseMyLocation = document.getElementById("btnUseMyLocation");

    function openOccModal(prefill = null) {
        if (!occModal) return;

        if (occError) {
            occError.classList.add("hidden");
            occError.textContent = "";
        }

        // reset
        if (occForm) occForm.reset();

        if (occPhotoPreview) {
            occPhotoPreview.src = "";
            occPhotoPreview.classList.add("hidden");
        }

        // prefill
        if (prefill) {
            if (occLat) occLat.value = String(prefill.lat);
            if (occLng) occLng.value = String(prefill.lng);
            if (occAddress) occAddress.value = prefill.address || "";
            if (occArea) occArea.value = prefill.area || "";

            if (pickMarker) {
                pickMarker.remove();
                pickMarker = null;
            }
            pickMarker = new mapboxgl.Marker({ color: "#0f172a" })
                .setLngLat([prefill.lng, prefill.lat])
                .addTo(map);

            if (mapCardBody) mapCardBody.textContent = "Posição selecionada. Completa e guarda a ocorrência.";
        } else {
            if (occAddress) occAddress.value = "";
            if (occArea) occArea.value = "";
            if (occLat) occLat.value = "";
            if (occLng) occLng.value = "";

            if (pickMarker) {
                pickMarker.remove();
                pickMarker = null;
            }

            if (mapCardBody) mapCardBody.textContent = "Para escolher no mapa, clica em “Escolher no mapa”.";
        }

        // dentro do modal: não dá para clicar no mapa por trás
        pickMode = false;
        occModal.classList.remove("hidden");
    }

    function closeOccModal() {
        pickMode = false;
        pickForOccurrence = false;
        if (occModal) occModal.classList.add("hidden");
        if (mapCardBody) mapCardBody.textContent = "Clica num ponto para ver detalhes.";
    }

    // Photo preview (optional)
    if (occPhoto && occPhotoPreview) {
        occPhoto.addEventListener("change", () => {
            const file = occPhoto.files && occPhoto.files[0] ? occPhoto.files[0] : null;

            if (!file) {
                occPhotoPreview.src = "";
                occPhotoPreview.classList.add("hidden");
                return;
            }

            if (!file.type || !file.type.startsWith("image/")) {
                if (occError) {
                    occError.textContent = "Formato inválido. Escolhe uma imagem (JPG/PNG/WebP).";
                    occError.classList.remove("hidden");
                }
                occPhoto.value = "";
                occPhotoPreview.src = "";
                occPhotoPreview.classList.add("hidden");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                if (occError) {
                    occError.textContent = "Imagem muito grande. Usa até 5MB.";
                    occError.classList.remove("hidden");
                }
                occPhoto.value = "";
                occPhotoPreview.src = "";
                occPhotoPreview.classList.add("hidden");
                return;
            }

            if (occError) {
                occError.classList.add("hidden");
                occError.textContent = "";
            }

            const url = URL.createObjectURL(file);
            occPhotoPreview.src = url;
            occPhotoPreview.classList.remove("hidden");
        });
    }

    [btnNewOccurrence, btnNewOccurrenceMobile].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => openOccModal(null));
    });

    [occBackdrop, occClose].forEach((el) => {
        if (el) el.addEventListener("click", closeOccModal);
    });

    // Fix: Escolher no mapa fecha o modal e deixa clicar no mapa
    if (btnPickOnMap) {
        btnPickOnMap.addEventListener("click", () => {
            pickForOccurrence = true;
            pendingPickedPoint = null;

            closeOccModal(); // fecha para permitir clique no mapa
            pickMode = true;

            if (mapCardBody) mapCardBody.textContent = "Agora clica no mapa para selecionar a posição da ocorrência.";
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (btnUseMyLocation) {
        btnUseMyLocation.addEventListener("click", async () => {
            if (occError) {
                occError.classList.add("hidden");
                occError.textContent = "";
            }

            if (!navigator.geolocation) {
                if (occError) {
                    occError.textContent = "O teu browser não suporta geolocalização.";
                    occError.classList.remove("hidden");
                }
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    // Usa o mesmo fluxo do pick no mapa (sem fechar modal)
                    // Aqui pode preencher direto e manter modal aberto
                    const geo = await reverseGeocode(lng, lat).catch(() => ({ address: "", area: "" }));
                    openOccModal({ lat, lng, address: geo.address || "", area: geo.area || "" });
                    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
                },
                () => {
                    if (occError) {
                        occError.textContent = "Não foi possível obter a localização. Verifica permissões do browser.";
                        occError.classList.remove("hidden");
                    }
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    async function reverseGeocode(lng, lat) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=pt&limit=1`;
        const res = await fetch(url);
        if (!res.ok) return { address: "", area: "" };

        const json = await res.json();
        const feature = json.features && json.features[0] ? json.features[0] : null;
        if (!feature) return { address: "", area: "" };

        const address = feature.place_name || "";

        const ctx = feature.context || [];
        const locality = ctx.find((c) => (c.id || "").startsWith("place"))?.text;
        const neighborhood = ctx.find((c) => (c.id || "").startsWith("neighborhood"))?.text;
        const district = ctx.find((c) => (c.id || "").startsWith("district"))?.text;

        const area = locality || neighborhood || district || "";
        return { address, area };
    }

    // Click on map to pick point (reabre modal preenchido se for fluxo de ocorrência)
    map.on("click", async (e) => {
        if (!pickMode) return;

        const { lng, lat } = e.lngLat;

        let address = "";
        let area = "";
        try {
            const geo = await reverseGeocode(lng, lat);
            address = geo.address || "";
            area = geo.area || "";
        } catch (_) { }

        pendingPickedPoint = { lat, lng, address, area };

        if (pickForOccurrence) {
            pickMode = false;
            pickForOccurrence = false;

            map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
            openOccModal(pendingPickedPoint);
            return;
        }
    });

    // Save occurrence
    if (occForm) {
        occForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (occError) {
                occError.classList.add("hidden");
                occError.textContent = "";
            }

            const title = (occTitleInput?.value || "").trim();
            const description = (occDescInput?.value || "").trim();
            const severity = occSeverity?.value || "medium";

            const lat = parseFloat(occLat?.value || "");
            const lng = parseFloat(occLng?.value || "");

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                if (occError) {
                    occError.textContent = "Escolhe uma posição no mapa (ou usa a tua localização) antes de guardar.";
                    occError.classList.remove("hidden");
                }
                return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const user = userData?.user;

            if (!user) {
                if (occError) {
                    occError.textContent = "Tens de fazer login para criar uma ocorrência.";
                    occError.classList.remove("hidden");
                }
                return;
            }

            const payload = {
                title,
                description,
                severity,
                status: "open",
                lat,
                lng,
                address: occAddress?.value || null,
                area: occArea?.value || null,
                user_id: user.id,
            };

            const { data: created, error: createErr } = await supabase
                .from("potholes")
                .insert(payload)
                .select("id")
                .single();

            if (createErr || !created?.id) {
                if (occError) {
                    occError.textContent = createErr?.message || "Erro ao gravar ocorrência.";
                    occError.classList.remove("hidden");
                }
                return;
            }

            // Optional photo upload + register
            const file = occPhoto && occPhoto.files && occPhoto.files[0] ? occPhoto.files[0] : null;
            if (file) {
                try {
                    const ext = file.name && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
                    const safeExt = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                    const rand = Math.random().toString(16).slice(2);
                    const fileName = `${Date.now()}-${rand}.${safeExt}`;
                    const path = `potholes/${created.id}/${fileName}`;

                    const { error: uploadErr } = await supabase.storage
                        .from("pothole-photos")
                        .upload(path, file, { contentType: file.type, upsert: false });

                    if (uploadErr) throw uploadErr;

                    const { error: photoErr } = await supabase.from("pothole_photos").insert({
                        pothole_id: created.id,
                        path,
                    });

                    if (photoErr) throw photoErr;
                } catch (photoError) {
                    alert("Ocorrência criada, mas não foi possível anexar a foto. Podes tentar novamente mais tarde.");
                }
            }

            closeOccModal();
            await loadPotholes();
            await loadOpenIssuesForDashboard();
            scrollToDashboard();
        });
    }

    // ====== AUTH STATE -> UI ======
    async function refreshAuthUI() {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        const isLoggedIn = Boolean(user);

        if (btnNewOccurrence) btnNewOccurrence.classList.toggle("hidden", !isLoggedIn);
        if (btnNewOccurrenceMobile) btnNewOccurrenceMobile.classList.toggle("hidden", !isLoggedIn);

        if (userBadge) {
            userBadge.classList.toggle("hidden", !isLoggedIn);
            userBadge.textContent = isLoggedIn ? (user.email || "") : "";
        }

        const goDashBtn = ensureGoDashboardButton();
        if (goDashBtn) goDashBtn.classList.toggle("hidden", !isLoggedIn);

        if (btnLogin) {
            btnLogin.textContent = isLoggedIn ? "Sair" : "Entrar";
            btnLogin.onclick = async () => {
                if (isLoggedIn) {
                    await supabase.auth.signOut();
                    await refreshAuthUI();
                } else {
                    openAuthModal();
                }
            };
        }

        if (dashboard) dashboard.classList.toggle("hidden", !isLoggedIn);
        sectionsToHideAfterLogin.forEach((sec) => sec.classList.toggle("hidden", isLoggedIn));

        if (isLoggedIn) {
            await loadOpenIssuesForDashboard();
            scrollToDashboard();
        } else {
            cachedIssues = [];
            if (issuesList) issuesList.innerHTML = "";
            if (issuesEmpty) {
                issuesEmpty.textContent = "Faz login para ver ocorrências abertas.";
                issuesEmpty.classList.remove("hidden");
            }
        }
    }

    supabase.auth.onAuthStateChange(async () => {
        await refreshAuthUI();
    });

    // ====== INIT ======
    (async () => {
        await refreshAuthUI();
        await loadPotholes();
    })();
});
