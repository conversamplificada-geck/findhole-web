document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------
    // Config (replace with your Supabase settings)
    // -----------------------------
    const SUPABASE_URL = "https://nqkekpwjzjdjtufwdbls.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2VrcHdqempkanR1ZndkYmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU0NDgsImV4cCI6MjA4NDY5MTQ0OH0.IoZlKpXR4o1sIZRi_DoyFdh3HUQa1VsclmzCLrYMiMA";

    // Your Mapbox public token (ok to be public)
    const MAPBOX_TOKEN =
        "pk.eyJ1IjoiZ2Vja29saXZlciIsImEiOiJjbWtwemVuNm0wbmNtM2dzZTcwbHhhMnFtIn0.9aJG3761SyXS-H5GkAtstA";

    // -----------------------------
    // Init Supabase
    // -----------------------------
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // -----------------------------
    // UI Elements
    // -----------------------------
    const menuBtn = document.querySelector(".mobile-menu-btn");
    const mobileMenu = document.querySelector(".mobile-menu");

    const btnAuth = document.getElementById("btnAuth");
    const btnAuthMobile = document.getElementById("btnAuthMobile");
    const btnLogout = document.getElementById("btnLogout");

    const btnNewReport = document.getElementById("btnNewReport");
    const btnNewReportMobile = document.getElementById("btnNewReportMobile");

    const authBackdrop = document.getElementById("authBackdrop");
    const authClose = document.getElementById("authClose");
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const reportBackdrop = document.getElementById("reportBackdrop");
    const reportClose = document.getElementById("reportClose");
    const reportForm = document.getElementById("reportForm");

    const reportTitleInput = document.getElementById("reportTitleInput");
    const reportDescInput = document.getElementById("reportDescInput");
    const reportSeverityInput = document.getElementById("reportSeverityInput");
    const reportLat = document.getElementById("reportLat");
    const reportLng = document.getElementById("reportLng");

    // Lead Form (kept as "fake submit" for now)
    const leadForm = document.getElementById("leadForm");

    // -----------------------------
    // Mobile menu
    // -----------------------------
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

    // -----------------------------
    // Mapbox setup
    // -----------------------------
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-8.621, 41.2279], // Maia-ish default
        zoom: 13,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const markersById = new Map();
    let selectedCoords = null;

    function severityColor(sev) {
        if (sev === "high") return "#ef4444";
        if (sev === "medium") return "#f59e0b";
        return "#10b981";
    }

    function statusLabel(status) {
        if (status === "open") return "Aberto";
        if (status === "in_progress") return "Em progresso";
        if (status === "resolved") return "Resolvido";
        return status || "";
    }

    function popupHtml(row) {
        const sevPt = row.severity === "high" ? "Alta" : row.severity === "medium" ? "Média" : "Baixa";
        return `
      <div style="min-width:220px;">
        <div style="font-weight:900; margin-bottom:6px;">${escapeHtml(row.title || "Ocorrência")}</div>
        <div style="color:#475569; font-weight:700; margin-bottom:8px;">
          ${sevPt} • ${statusLabel(row.status)}
        </div>
        ${row.description ? `<div style="color:#334155;">${escapeHtml(row.description)}</div>` : ""}
        <div style="margin-top:10px; color:#94a3b8; font-weight:700; font-size:12px;">
          ${row.created_at ? new Date(row.created_at).toLocaleString() : ""}
        </div>
      </div>
    `;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function upsertMarker(row) {
        if (!row || !row.id) return;

        const existing = markersById.get(row.id);
        if (existing) {
            // Update popup content if needed
            existing.getPopup().setHTML(popupHtml(row));
            return;
        }

        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.background = severityColor(row.severity);
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 8px 18px rgba(2,6,23,0.25)";
        el.style.cursor = "pointer";

        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml(row));

        const marker = new mapboxgl.Marker(el)
            .setLngLat([row.lng, row.lat])
            .setPopup(popup)
            .addTo(map);

        markersById.set(row.id, marker);
    }

    async function loadPotholes() {
        const { data, error } = await supabase
            .from("potholes")
            .select("id, created_at, title, description, severity, status, lat, lng")
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) {
            console.error("Load potholes error:", error);
            return;
        }

        (data || []).forEach(upsertMarker);
    }

    map.on("load", () => {
        loadPotholes();
    });

    // Click map to set coords (only useful when report modal is open)
    map.on("click", (e) => {
        if (!reportBackdrop.classList.contains("open")) return;

        selectedCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        reportLat.value = selectedCoords.lat.toFixed(6);
        reportLng.value = selectedCoords.lng.toFixed(6);
    });

    // -----------------------------
    // Auth modal helpers
    // -----------------------------
    function openAuthModal() {
        authBackdrop.classList.add("open");
        authBackdrop.setAttribute("aria-hidden", "false");
    }

    function closeAuthModal() {
        authBackdrop.classList.remove("open");
        authBackdrop.setAttribute("aria-hidden", "true");
    }

    function openReportModal() {
        reportBackdrop.classList.add("open");
        reportBackdrop.setAttribute("aria-hidden", "false");
    }

    function closeReportModal() {
        reportBackdrop.classList.remove("open");
        reportBackdrop.setAttribute("aria-hidden", "true");
    }

    function setTab(which) {
        if (which === "login") {
            tabLogin.classList.add("active");
            tabSignup.classList.remove("active");
            loginForm.style.display = "block";
            signupForm.style.display = "none";
        } else {
            tabLogin.classList.remove("active");
            tabSignup.classList.add("active");
            loginForm.style.display = "none";
            signupForm.style.display = "block";
        }
    }

    tabLogin.addEventListener("click", () => setTab("login"));
    tabSignup.addEventListener("click", () => setTab("signup"));

    authClose.addEventListener("click", closeAuthModal);
    authBackdrop.addEventListener("click", (e) => {
        if (e.target === authBackdrop) closeAuthModal();
    });

    reportClose.addEventListener("click", closeReportModal);
    reportBackdrop.addEventListener("click", (e) => {
        if (e.target === reportBackdrop) closeReportModal();
    });

    // -----------------------------
    // Session UI state
    // -----------------------------
    function setLoggedOutUI() {
        btnAuth.textContent = "Entrar";
        btnAuthMobile.textContent = "Entrar";
        btnLogout.style.display = "none";
        btnNewReport.style.display = "none";
        btnNewReportMobile.style.display = "none";
    }

    function setLoggedInUI(email) {
        btnAuth.textContent = email ? email : "Conta";
        btnAuthMobile.textContent = "Conta";
        btnLogout.style.display = "inline-flex";
        btnNewReport.style.display = "inline-flex";
        btnNewReportMobile.style.display = "inline-flex";
    }

    async function refreshSessionUI() {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) {
            setLoggedOutUI();
            return;
        }

        setLoggedInUI(session.user?.email);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) setLoggedOutUI();
        else setLoggedInUI(session.user?.email);
    });

    // Buttons: open auth modal
    btnAuth.addEventListener("click", openAuthModal);
    btnAuthMobile.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.remove("active");
        openAuthModal();
    });

    // Logout
    btnLogout.addEventListener("click", async () => {
        await supabase.auth.signOut();
        closeAuthModal();
        alert("Sessão terminada.");
    });

    // New report buttons
    btnNewReport.addEventListener("click", () => {
        selectedCoords = null;
        reportForm.reset();
        reportLat.value = "";
        reportLng.value = "";
        openReportModal();
    });

    btnNewReportMobile.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.remove("active");
        selectedCoords = null;
        reportForm.reset();
        reportLat.value = "";
        reportLng.value = "";
        openReportModal();
    });

    // -----------------------------
    // Login / Signup handlers
    // -----------------------------
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            alert(`Erro ao entrar: ${error.message}`);
            return;
        }

        alert("Login feito com sucesso.");
        closeAuthModal();
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });

        if (error) {
            alert(`Erro ao criar conta: ${error.message}`);
            return;
        }

        // If email confirmation is enabled, session may be null until confirmed.
        if (!data.session) {
            alert("Conta criada. Confirma o email para ativar e depois faz login.");
            setTab("login");
            return;
        }

        alert("Conta criada e sessão iniciada.");
        closeAuthModal();
    });

    // -----------------------------
    // Create new pothole
    // -----------------------------
    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) {
            alert("Faz login antes de criar uma ocorrência.");
            closeReportModal();
            openAuthModal();
            return;
        }

        if (!selectedCoords) {
            alert("Seleciona a posição no mapa: abre o modal e clica no mapa.");
            return;
        }

        const payload = {
            title: reportTitleInput.value.trim(),
            description: reportDescInput.value.trim(),
            severity: reportSeverityInput.value,
            status: "open",
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            user_id: session.user.id, // requires column + RLS policies already created by you
        };

        const { data: inserted, error } = await supabase.from("potholes").insert(payload).select("*").single();

        if (error) {
            alert(`Erro ao guardar: ${error.message}`);
            return;
        }

        upsertMarker(inserted);
        closeReportModal();
        alert("Ocorrência criada com sucesso.");
    });

    // -----------------------------
    // Lead form (kept as demo)
    // -----------------------------
    if (leadForm) {
        leadForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const btn = leadForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;

            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
            btn.disabled = true;
            btn.style.opacity = "0.7";

            setTimeout(() => {
                btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> Pedido Enviado!';
                btn.style.backgroundColor = "var(--accent)";

                alert(
                    "Obrigado pelo seu interesse!\n\nRecebemos os seus dados e a nossa equipa entrará em contacto em breve para agendar a demonstração do piloto."
                );

                leadForm.reset();

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.backgroundColor = "";
                }, 2500);
            }, 1200);
        });
    }

    // Initial state
    refreshSessionUI();
});
