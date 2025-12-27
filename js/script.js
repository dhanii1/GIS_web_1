// --- TANDAI LINK NAVBAR YANG AKTIF ---
const links = document.querySelectorAll('.navbar a');
const currentPath = window.location.pathname;

links.forEach((link) => {
    // Bandingkan pathname untuk menghindari masalah dengan query string atau hash
    try {
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    } catch (e) {
        // Jika URL tidak valid, abaikan
    }
});

// --- AMBIL ELEMEN FILTER ---
const filterInputs = document.querySelectorAll('.filter-jenjang input, .filter-status input');

// --- FUNGSI AMBIL DATA FILTER ---
function getFilter() {
    return {
        // ambil semua nilai jenjang yang dicentang
        jenjang: [...document.querySelectorAll('.filter-jenjang input:checked')].map(
            (el) => el.value
        ),
        status: [...document.querySelectorAll('.filter-status input:checked')].map(
            (el) => el.value
        ),
    };
}

// --- LOGIKA UTAMA (Data Aggregator) ---
function processData() {
    const filter = getFilter();

    // Objek untuk menampung data per kecamatan
    const statsKecamatan = {};

    // Objek untuk menampung data chart
    const statsChart = { SD: 0, SMP: 0, SMA: 0, SMK: 0 };

    // Iterasi data pendidikan
    dataPendidikan.forEach((d) => {
        // --- CEK FILTER JENJANG ---
        // Jika jenjang tidak sesuai filter, skip data ini
        if (!filter.jenjang.includes(d.jenjang)) return;

        // inisialisasi objek kecamatan jika belum ada
        if (!statsKecamatan[d.kecamatan]) {
            statsKecamatan[d.kecamatan] = {
                kecamatan: d.kecamatan,
                sekolah_negeri: 0,
                sekolah_swasta: 0,
                total_sekolah: 0,
                total_guru: 0,
                total_murid: 0,
            };
        }

        // --- HITUNG DATA BERDASARKAN TIPE ---
        // Inisialisasi nilai masuk
        let nilaiMasuk = 0;
        let nilaiNegeri = d.negeri || 0;
        let nilaiSwasta = d.swasta || 0;

        // negeri
        if (filter.status.includes('negeri')) {
            nilaiMasuk += nilaiNegeri;
        }

        // swasta
        if (filter.status.includes('swasta')) {
            nilaiMasuk += nilaiSwasta;
        }

        // Agregasi data berdasarkan tipe
        if (d.tipe === 'sekolah') {
            // Tambah ke kategori negeri/swasta
            if (filter.status.includes('negeri'))
                statsKecamatan[d.kecamatan].sekolah_negeri += nilaiNegeri;
            if (filter.status.includes('swasta'))
                statsKecamatan[d.kecamatan].sekolah_swasta += nilaiSwasta;

            // Tambah ke total sekolah
            statsKecamatan[d.kecamatan].total_sekolah += nilaiMasuk;

            // Tambah ke chart jenjang
            if (statsChart[d.jenjang] !== undefined) {
                statsChart[d.jenjang] += nilaiMasuk;
            }
        } else if (d.tipe === 'guru') {
            statsKecamatan[d.kecamatan].total_guru += nilaiMasuk;
        } else if (d.tipe === 'murid') {
            statsKecamatan[d.kecamatan].total_murid += nilaiMasuk;
        }
    });

    return {
        kecamatan: Object.values(statsKecamatan),
        chart: statsChart,
    };
}

// --- RENDER SIDEBAR ---
function renderSidebar(data) {
    const sidebarBody = document.querySelector('.sidebar-content');

    if (!sidebarBody) return; // Jaga-jaga kalau elemen hilang

    if (!data.length) {
        sidebarBody.innerHTML =
            '<div class="text-center text-muted p-3">Data tidak ditemukan</div>';
        return;
    }

    // Urutkan kecamatan berdasarkan nama A-Z
    data.sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

    // Generate HTML
    sidebarBody.innerHTML = data
        .map(
            (item) => `
        <div class="sidebar-item">
            <div class="kecamatan-name border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
                <span class="fw-bold text-white">${item.kecamatan}</span>
                <span class="badge bg-primary rounded-pill">${item.total_sekolah} Unit</span>
            </div>
            
            <div class="kecamatan-stats">
                <div class="d-flex justify-content-between mb-2" style="font-size: 0.8rem;">
                    <span class="text-secondary">Negeri: <b class="text-white">${
                        item.sekolah_negeri
                    }</b></span>
                    <span class="text-secondary">Swasta: <b class="text-white">${
                        item.sekolah_swasta
                    }</b></span>
                </div>

                <div class="row g-2 mt-2 pt-2 border-top border-secondary">
                    <div class="col-6">
                        <div class="d-flex align-items-center text-success">
                            <i class="fas fa-chalkboard-teacher fa-lg me-2"></i>
                            <div style="line-height: 1.2;">
                                <div style="font-size: 0.65rem; opacity: 0.8;">GURU</div>
                                <div style="font-weight: bold; font-size: 0.9rem;">${item.total_guru.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center text-warning">
                            <i class="fas fa-user-graduate fa-lg me-2"></i>
                            <div style="line-height: 1.2;">
                                <div style="font-size: 0.65rem; opacity: 0.8;">MURID</div>
                                <div style="font-weight: bold; font-size: 0.9rem;">${item.total_murid.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
        )
        .join('');
}

// --- RENDER CHART ---
let chartInstance = null;

function renderChart(stats) {
    const ctx = document.getElementById('chartPendidikan');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    // Warna batang
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    chartInstance = new Chart(ctx, {
        type: 'bar', // Grafik batang
        data: {
            labels: ['SD', 'SMP', 'SMA', 'SMK'],
            datasets: [
                {
                    label: 'Jumlah Sekolah',
                    data: [stats.SD, stats.SMP, stats.SMA, stats.SMK],
                    backgroundColor: colors,
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20,
                },
            },
            plugins: {
                legend: { display: false }, // Sembunyikan legenda
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.raw + ' Sekolah';
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#374151' }, // Grid abu gelap
                    ticks: { color: '#9ca3af' },
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' },
                },
            },
        },
    });
}

// --- FUNGSI UPDATE GLOBAL ---
function updateUI() {
    // Proses Data
    const result = processData(); // Mengembalikan { kecamatan: [...], chart: {...} }

    // Render Sidebar
    renderSidebar(result.kecamatan);

    // Render Chart
    renderChart(result.chart);

    // KIRIM DATA KE PETA (IFRAME)
    // Ambil elemen iframe peta
    const mapIframe = document.querySelector('.map-frame');

    // Cek apakah iframe dan fungsi di dalamnya sudah siap
    if (mapIframe && mapIframe.contentWindow && mapIframe.contentWindow.updateMapData) {
        // Panggil fungsi di dalam iframe untuk update data peta
        mapIframe.contentWindow.updateMapData(result.kecamatan);
    } else {
        // Jika belum siap, pasang event listener untuk load
        mapIframe.onload = function () {
            if (mapIframe.contentWindow.updateMapData) {
                mapIframe.contentWindow.updateMapData(result.kecamatan);
            }
        };
    }
}

// EVENT LISTENER
// Pasang event listener ke semua input filter
filterInputs.forEach((el) => el.addEventListener('change', updateUI));

// Jalankan sekali saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', updateUI);

//# ========== DATA.HTML ==========
document.addEventListener('DOMContentLoaded', function () {
    const tbody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');

    let totalSekolah = 0;
    let totalGuru = 0;
    let totalMurid = 0;

    // Pastikan data tersedia
    if (typeof dataPendidikan !== 'undefined') {
        renderTable(dataPendidikan);
        calculateStats(dataPendidikan);
    } else {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Gagal memuat data! Periksa koneksi file JS.</td></tr>`;
    }

    // Fungsi Render Tabel
    function renderTable(data) {
        tbody.innerHTML = '';
        data.forEach((item, index) => {
            const valNegeri = parseInt(item.negeri) || 0;
            const valSwasta = parseInt(item.swasta) || 0;
            const subTotal = valNegeri + valSwasta;

            // Warna Badge Jenjang
            let badgeColor = 'bg-secondary';
            if (item.jenjang === 'SD') badgeColor = 'bg-sd text-white';
            else if (item.jenjang === 'SMP') badgeColor = 'bg-smp text-white';
            else if (item.jenjang === 'SMA') badgeColor = 'bg-sma text-white';
            else if (item.jenjang === 'SMK') badgeColor = 'bg-smk text-white';

            // Ikon Tipe
            let iconTipe = '';
            if (item.tipe === 'sekolah')
                iconTipe = '<i class="fas fa-school me-2 sekolah"></i>';
            if (item.tipe === 'guru')
                iconTipe = '<i class="fas fa-chalkboard-teacher me-2 guru"></i>';
            if (item.tipe === 'murid')
                iconTipe = '<i class="fas fa-user-graduate me-2 murid"></i>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                        <td class="ps-4 text-secondary font-monospace">${index + 1}</td>
                        <td class="fw-bold text-secondary">${item.kecamatan}</td>
                        <td><span class="badge-jenjang ${badgeColor}">${item.jenjang}</span></td>
                        <td class="text-capitalize text-secondary d-flex align-items-center">${iconTipe} ${
                item.tipe
            }</td>
                        <td class="text-center text-secondary font-monospace">${valNegeri.toLocaleString(
                            'id-ID'
                        )}</td>
                        <td class="text-center text-secondary font-monospace">${valSwasta.toLocaleString(
                            'id-ID'
                        )}</td>
                        <td class="text-center fw-bold text-white pe-4 font-monospace" style="background: rgba(255,255,255,0.02);">${subTotal.toLocaleString(
                            'id-ID'
                        )}</td>
                    `;
            tbody.appendChild(tr);
        });
    }

    // Fungsi Hitung Statistik
    function calculateStats(data) {
        data.forEach((item) => {
            const total = (parseInt(item.negeri) || 0) + (parseInt(item.swasta) || 0);
            if (item.tipe === 'sekolah') totalSekolah += total;
            if (item.tipe === 'guru') totalGuru += total;
            if (item.tipe === 'murid') totalMurid += total;
        });

        // Animasi Angka (Opsional / Sederhana)
        document.getElementById('statSekolah').textContent = totalSekolah.toLocaleString('id-ID');
        document.getElementById('statGuru').textContent = totalGuru.toLocaleString('id-ID');
        document.getElementById('statMurid').textContent = totalMurid.toLocaleString('id-ID');
    }

    // Fungsi Pencarian
    searchInput.addEventListener('keyup', function () {
        const value = this.value.toLowerCase();
        const filteredData = dataPendidikan.filter(
            (item) =>
                item.kecamatan.toLowerCase().includes(value) ||
                item.jenjang.toLowerCase().includes(value) ||
                item.tipe.toLowerCase().includes(value)
        );
        renderTable(filteredData);
    });
});

// Fungsi Download CSV
function downloadCSV() {
    if (typeof dataPendidikan === 'undefined') return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No,Kecamatan,Jenjang,Kategori,Negeri,Swasta,Total\n';
    dataPendidikan.forEach((item, index) => {
        const total = (parseInt(item.negeri) || 0) + (parseInt(item.swasta) || 0);
        const row = `${index + 1},${item.kecamatan},${item.jenjang},${item.tipe},${item.negeri},${
            item.swasta
        },${total}`;
        csvContent += row + '\r\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'data_pendidikan_demak_2024.csv');
    document.body.appendChild(link);
    link.click();
}
