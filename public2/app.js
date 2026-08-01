document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Mobile ---
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    if (openBtn) {
        openBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // --- Navigation Onglets ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Retirer active partout
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Mettre active sur cliqué
            item.classList.add('active');
            const targetId = item.getAttribute('data-section');
            const targetSec = document.getElementById(targetId);
            if(targetSec) {
                targetSec.classList.add('active');
            }
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // --- Initialisation et Fetch Data ---
    fetchUserData();
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        fetch('/api/logout', { method: 'POST' }).then(() => {
            window.location.href = '/login';
        });
    });
});

async function fetchUserData() {
    try {
        const res = await fetch('/api/user');
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        const user = await res.json();
        document.getElementById('userName').textContent = user.username || user.global_name || 'Utilisateur';
        fetchGuilds();
    } catch(e) {
        console.error('Erreur user:', e);
    }
}

async function fetchGuilds() {
    // Mock for demo
    const guildSelector = document.getElementById('guildSelector');
    guildSelector.innerHTML = '<option value="12345">Serveur BagBot Elite</option>';
    
    guildSelector.addEventListener('change', (e) => {
        const guildId = e.target.value;
        if(guildId) {
            fetch('/api/select-guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId })
            }).then(() => fetchConfig());
        }
    });

    // Auto select first
    guildSelector.value = "12345";
    guildSelector.dispatchEvent(new Event('change'));
}

async function fetchConfig() {
    // Fetch channels and roles to populate selects
    console.log("Configuration chargée");
}

function saveConfig(section) {
    // Save logic
    alert('Configuration de ' + section + ' sauvegardée avec succès ! (Simulé)');
}
