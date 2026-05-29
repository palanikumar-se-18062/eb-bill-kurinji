(function () {
    'use strict';

    const API_BASE = '/server/eb_bill_api/execute';
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let currentCalc = null;
    let historyCache = [];
    let charts = { monthly: null, acUsage: null, aaditya: null, kishore: null, palani: null, common: null };
    let confirmCallback = null;

    const $ = (id) => document.getElementById(id);
    const monthInput = $('month');
    const totalUnitsInput = $('totalUnits');
    const totalBillInput = $('totalBill');
    const ac1Input = $('ac1');
    const ac2Input = $('ac2');
    const ac3Input = $('ac3');

    let pickerYear = new Date().getFullYear();
    let pickerMonth = new Date().getMonth();
    const monthDisplay = $('monthDisplay');
    const monthDropdown = $('monthDropdown');
    const monthGrid = $('monthGrid');

    setDefaultMonth();
    initMonthPicker();
    initRouter();

    $('btnCalculate').addEventListener('click', calculate);
    $('btnReset').addEventListener('click', resetForm);
    $('btnSave').addEventListener('click', saveMonth);
    $('confirmNo').addEventListener('click', closeConfirm);
    $('viewClose').addEventListener('click', () => $('viewOverlay').classList.add('hidden'));

    [totalUnitsInput, totalBillInput, ac1Input, ac2Input, ac3Input].forEach(input => {
        input.addEventListener('input', () => {
            currentCalc = null;
            $('btnSave').disabled = true;
        });
    });

    function initRouter() {
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
    }

    function handleRoute() {
        const hash = window.location.hash.replace('#', '') || 'home';
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        var page = $('page-' + hash);
        if (page) {
            page.classList.remove('hidden');
        } else {
            $('page-home').classList.remove('hidden');
        }

        var link = document.querySelector('.nav-link[data-page="' + hash + '"]');
        if (link) link.classList.add('active');

        if (hash === 'history') {
            renderHistory();
        }
    }

    function initMonthPicker() {
        monthDisplay.addEventListener('click', toggleDropdown);
        $('prevYear').addEventListener('click', () => { pickerYear--; renderPickerGrid(); });
        $('nextYear').addEventListener('click', () => { pickerYear++; renderPickerGrid(); });
        document.addEventListener('click', (e) => {
            if (!$('monthPicker').contains(e.target)) {
                monthDropdown.classList.add('hidden');
                monthDisplay.classList.remove('active');
            }
        });
        renderPickerGrid();
    }

    function toggleDropdown() {
        const isHidden = monthDropdown.classList.contains('hidden');
        monthDropdown.classList.toggle('hidden');
        monthDisplay.classList.toggle('active', isHidden);
    }

    function renderPickerGrid() {
        $('pickerYear').textContent = pickerYear;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        monthGrid.innerHTML = MONTH_NAMES.map((name, i) => {
            const selected = (pickerYear === getSelectedYear() && i === getSelectedMonth());
            const isCurrent = (pickerYear === currentYear && i === currentMonth);
            let cls = 'month-btn';
            if (selected) cls += ' selected';
            if (isCurrent && !selected) cls += ' current';
            return '<button type="button" class="' + cls + '" data-month="' + i + '">' + name + '</button>';
        }).join('');

        monthGrid.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pickerMonth = parseInt(btn.dataset.month, 10);
                selectMonth(pickerYear, pickerMonth);
            });
        });
    }

    function selectMonth(year, month) {
        const m = String(month + 1).padStart(2, '0');
        monthInput.value = year + '-' + m;
        monthDisplay.textContent = MONTH_NAMES[month] + ' ' + year;
        monthDropdown.classList.add('hidden');
        monthDisplay.classList.remove('active');
        renderPickerGrid();
    }

    function getSelectedYear() {
        if (!monthInput.value) return null;
        return parseInt(monthInput.value.split('-')[0], 10);
    }

    function getSelectedMonth() {
        if (!monthInput.value) return null;
        return parseInt(monthInput.value.split('-')[1], 10) - 1;
    }

    function setDefaultMonth() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        pickerYear = y;
        pickerMonth = m;
        monthInput.value = y + '-' + String(m + 1).padStart(2, '0');
        monthDisplay.textContent = MONTH_NAMES[m] + ' ' + y;
    }

    function parseResponse(json) {
        if (json.output) return JSON.parse(json.output);
        return json;
    }

    async function fetchHistory() {
        try {
            const res = await fetch(API_BASE + '?action=list');
            const raw = await res.json();
            const json = parseResponse(raw);
            if (json.success) {
                historyCache = json.data;
                return json.data;
            }
            return [];
        } catch (e) {
            showToast('Failed to load data');
            return [];
        }
    }

    async function apiSave(record) {
        const res = await fetch(API_BASE + '?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return parseResponse(await res.json());
    }

    async function apiDelete(month) {
        const res = await fetch(API_BASE + '?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: month })
        });
        return parseResponse(await res.json());
    }

    function showToast(msg) {
        const toast = $('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function showConfirm(msg, cb) {
        $('confirmMessage').textContent = msg;
        $('confirmOverlay').classList.remove('hidden');
        confirmCallback = cb;
        $('confirmYes').onclick = () => {
            const fn = confirmCallback;
            closeConfirm();
            if (fn) fn();
        };
    }

    function closeConfirm() {
        $('confirmOverlay').classList.add('hidden');
        confirmCallback = null;
    }

    function validate() {
        const totalUnits = parseFloat(totalUnitsInput.value);
        const totalBill = parseFloat(totalBillInput.value);
        const a1 = parseFloat(ac1Input.value) || 0;
        const a2 = parseFloat(ac2Input.value) || 0;
        const a3 = parseFloat(ac3Input.value) || 0;

        if (!monthInput.value) {
            showToast('Please select a month');
            return null;
        }
        if (!totalUnits || totalUnits <= 0) {
            showToast('Total Units must be greater than 0');
            return null;
        }
        if (!totalBill || totalBill <= 0) {
            showToast('Total Bill must be greater than 0');
            return null;
        }
        if (a1 + a2 + a3 > totalUnits) {
            showToast('AC units total cannot exceed Total Units');
            return null;
        }

        return { totalUnits, totalBill, ac1: a1, ac2: a2, ac3: a3 };
    }

    function calculate() {
        const v = validate();
        if (!v) return;

        const perUnitRate = v.totalBill / v.totalUnits;
        const commonUnits = parseFloat((v.totalUnits - (v.ac1 + v.ac2 + v.ac3)).toFixed(2));
        const commonPerPerson = commonUnits / 3;

        const person1 = parseFloat(((v.ac1 + commonPerPerson) * perUnitRate).toFixed(2));
        const person2 = parseFloat(((v.ac2 + commonPerPerson) * perUnitRate).toFixed(2));
        const person3 = parseFloat(((v.ac3 + commonPerPerson) * perUnitRate).toFixed(2));

        currentCalc = {
            month: monthInput.value,
            totalUnits: v.totalUnits,
            totalBill: v.totalBill,
            perUnitRate: perUnitRate,
            ac1: v.ac1,
            ac2: v.ac2,
            ac3: v.ac3,
            commonUnits: commonUnits,
            person1Amount: person1,
            person2Amount: person2,
            person3Amount: person3,
            createdAt: new Date().toISOString()
        };

        renderResult(currentCalc);
        $('btnSave').disabled = false;
        showToast('Calculation completed');
    }

    function renderResult(c) {
        $('summaryRate').textContent = '\u20B9' + c.perUnitRate.toFixed(2) + ' / unit';
        $('summaryCommon').textContent = c.commonUnits.toFixed(2) + ' Units';
        $('summaryShare').textContent = (c.commonUnits / 3).toFixed(2) + ' Units';

        const commonPerPerson = c.commonUnits / 3;
        const rooms = [
            { name: 'Aaditya', ac: c.ac1, amount: c.person1Amount },
            { name: 'Kishore', ac: c.ac2, amount: c.person2Amount },
            { name: 'Palani', ac: c.ac3, amount: c.person3Amount }
        ];

        $('breakdownGrid').innerHTML = rooms.map(r => {
            const acCharge = r.ac * c.perUnitRate;
            const commonCharge = commonPerPerson * c.perUnitRate;
            return '<div class="breakdown-card">' +
                '<h3>' + r.name + '</h3>' +
                '<div class="breakdown-row"><span>AC Units</span><span>' + r.ac.toFixed(2) + '</span></div>' +
                '<div class="breakdown-row"><span>AC Charge</span><span>\u20B9' + acCharge.toFixed(2) + '</span></div>' +
                '<div class="breakdown-row"><span>Common Charge</span><span>\u20B9' + commonCharge.toFixed(2) + '</span></div>' +
                '<div class="breakdown-total"><span>Total Payable</span><span>\u20B9' + r.amount.toFixed(2) + '</span></div>' +
                '</div>';
        }).join('');

        $('resultSection').classList.remove('hidden');
    }

    $('btnCopy').addEventListener('click', copyResult);
    $('btnWhatsapp').addEventListener('click', shareWhatsApp);

    function copyResult() {
        var text = getResultText();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard');
        });
    }

    function getResultText() {
        if (!currentCalc) return '';
        const c = currentCalc;
        const commonPerPerson = c.commonUnits / 3;
        const commonCharge = commonPerPerson * c.perUnitRate;

        function personLine(name, ac, total) {
            var acCharge = ac * c.perUnitRate;
            return name + ': AC Rs.' + acCharge.toFixed(2) + ' + Common Rs.' + commonCharge.toFixed(2) + ' = *Rs.' + total.toFixed(2) + '*';
        }

        return [
            '*EB Bill - ' + formatMonth(c.month) + '*',
            '',
            'Total Units: ' + c.totalUnits,
            'Total Bill: Rs.' + c.totalBill.toFixed(2),
            'Per Unit Rate: Rs.' + c.perUnitRate.toFixed(2),
            '',
            '*Units Split-up:*',
            'Common Units: ' + c.commonUnits.toFixed(2) + ' (' + commonPerPerson.toFixed(2) + '/person)',
            'Aaditya: ' + c.ac1.toFixed(2) + ' + ' + commonPerPerson.toFixed(2) + ' = ' + (c.ac1 + commonPerPerson).toFixed(2) + ' u',
            'Kishore: ' + c.ac2.toFixed(2) + ' + ' + commonPerPerson.toFixed(2) + ' = ' + (c.ac2 + commonPerPerson).toFixed(2) + ' u',
            'Palani: ' + c.ac3.toFixed(2) + ' + ' + commonPerPerson.toFixed(2) + ' = ' + (c.ac3 + commonPerPerson).toFixed(2) + ' u',
            '',
            '*Breakdown:*',
            personLine('Aaditya', c.ac1, c.person1Amount),
            personLine('Kishore', c.ac2, c.person2Amount),
            personLine('Palani', c.ac3, c.person3Amount)
        ].join('\n');
    }

    function shareWhatsApp() {
        var text = getResultText();
        if (!text) return;
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
    }

    function resetForm() {
        totalUnitsInput.value = '';
        totalBillInput.value = '';
        ac1Input.value = '';
        ac2Input.value = '';
        ac3Input.value = '';
        setDefaultMonth();
        currentCalc = null;
        $('btnSave').disabled = true;
        $('resultSection').classList.add('hidden');
    }

    async function saveMonth() {
        if (!currentCalc) return;

        const existing = historyCache.find(h => h.month === currentCalc.month);
        const confirmMsg = existing
            ? 'Data for ' + formatMonth(currentCalc.month) + ' already exists. Overwrite?'
            : 'This will save the bill data to the cloud for future reference. Please avoid storing dummy data. Continue?';

        showConfirm(confirmMsg, async () => {
            try {
                const result = await apiSave(currentCalc);
                if (result.success) {
                    await renderHistory();
                    $('btnSave').disabled = true;
                    showToast('Data saved');
                } else {
                    showToast('Save failed: ' + (result.error || 'Unknown error'));
                }
            } catch (e) {
                showToast('Save failed');
            }
        });
    }

    function formatMonth(m) {
        const [y, mo] = m.split('-');
        return MONTH_NAMES[parseInt(mo, 10) - 1] + ' ' + y;
    }

    async function renderHistory() {
        const history = await fetchHistory();
        const tbody = $('historyBody');

        if (history.length === 0) {
            tbody.innerHTML = '';
            $('emptyState').classList.remove('hidden');
            $('historyTable').classList.add('hidden');
            $('statsSection').classList.add('hidden');
            $('chartsSection').classList.add('hidden');
            return;
        }

        $('emptyState').classList.add('hidden');
        $('historyTable').classList.remove('hidden');

        tbody.innerHTML = history.map((h, i) =>
            '<tr>' +
            '<td>' + formatMonth(h.month) + '</td>' +
            '<td>' + h.totalUnits.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.totalBill.toFixed(2) + '</td>' +
            '<td>' + h.ac1.toFixed(2) + '</td>' +
            '<td>' + h.ac2.toFixed(2) + '</td>' +
            '<td>' + h.ac3.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.perUnitRate.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.person1Amount.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.person2Amount.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.person3Amount.toFixed(2) + '</td>' +
            '<td>' +
                '<button class="btn btn-primary btn-sm" onclick="app.viewRecord(' + i + ')">View</button> ' +
                '<button class="btn btn-danger btn-sm" onclick="app.deleteRecord(' + i + ')">Delete</button>' +
            '</td>' +
            '</tr>'
        ).join('');

        renderStats(history);
        renderCharts(history);
    }

    function viewRecord(idx) {
        const h = historyCache[idx];
        if (!h) return;

        $('viewTitle').textContent = formatMonth(h.month) + ' - Bill Details';
        const commonPerPerson = h.commonUnits / 3;

        const row = (label, val) =>
            '<div class="breakdown-row"><span>' + label + '</span><span>' + val + '</span></div>';

        $('viewContent').innerHTML =
            row('Total Units', h.totalUnits.toFixed(2)) +
            row('Total Bill', '\u20B9' + h.totalBill.toFixed(2)) +
            row('Per Unit Rate', '\u20B9' + h.perUnitRate.toFixed(2)) +
            row('Common Units', h.commonUnits.toFixed(2)) +
            row('Common/Person', commonPerPerson.toFixed(2) + ' units / \u20B9' + (commonPerPerson * h.perUnitRate).toFixed(2)) +
            '<hr style="margin:12px 0;border:none;border-top:1px solid #e0e0e0">' +
            row('Aaditya (AC: ' + h.ac1.toFixed(2) + ')', '\u20B9' + h.person1Amount.toFixed(2)) +
            row('Kishore (AC: ' + h.ac2.toFixed(2) + ')', '\u20B9' + h.person2Amount.toFixed(2)) +
            row('Palani (AC: ' + h.ac3.toFixed(2) + ')', '\u20B9' + h.person3Amount.toFixed(2));

        $('viewOverlay').classList.remove('hidden');
    }

    function deleteRecord(idx) {
        const h = historyCache[idx];
        if (!h) return;

        showConfirm('Delete record for ' + formatMonth(h.month) + '?', async () => {
            try {
                const result = await apiDelete(h.month);
                if (result.success) {
                    await renderHistory();
                    showToast('Record deleted');
                } else {
                    showToast('Delete failed: ' + (result.error || 'Unknown error'));
                }
            } catch (e) {
                showToast('Delete failed');
            }
        });
    }

    function renderStats(history) {
        const bills = history.map(h => h.totalBill);
        const units = history.map(h => h.totalUnits);
        const rates = history.map(h => h.perUnitRate);

        $('statHighBill').textContent = '\u20B9' + Math.max(...bills).toFixed(0);
        $('statAvgBill').textContent = '\u20B9' + (bills.reduce((a, b) => a + b, 0) / bills.length).toFixed(0);
        $('statHighUnits').textContent = Math.max(...units) + ' Units';
        $('statAvgRate').textContent = '\u20B9' + (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2);

        $('statsSection').classList.remove('hidden');
    }

    function renderCharts(history) {
        Chart.register(ChartDataLabels);
        const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
        const labels = sorted.map(h => formatMonth(h.month));

        const isMobile = window.innerWidth < 600;
        const labelSize = isMobile ? 9 : 11;

        const defaultDatalabels = {
            anchor: 'end',
            align: 'top',
            offset: 4,
            font: { size: labelSize, weight: '600' },
            color: '#333',
            formatter: function (v) { return v % 1 === 0 ? v : v.toFixed(2); }
        };

        const chartLayout = { padding: { top: 25 } };
        const baseOptions = { responsive: true, aspectRatio: isMobile ? 1.4 : 2 };

        if (charts.monthly) charts.monthly.destroy();
        if (charts.acUsage) charts.acUsage.destroy();
        if (charts.aaditya) charts.aaditya.destroy();
        if (charts.kishore) charts.kishore.destroy();
        if (charts.palani) charts.palani.destroy();
        if (charts.common) charts.common.destroy();

        charts.monthly = new Chart($('chartMonthly'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Units',
                        data: sorted.map(h => h.totalUnits),
                        backgroundColor: '#42a5f5',
                        order: 2,
                        datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { size: isMobile ? 10 : 12, weight: '700' }, formatter: function (v) { return (v % 1 === 0 ? v : v.toFixed(0)) + ' u'; } }
                    },
                    {
                        label: 'Total Bill',
                        data: sorted.map(h => h.totalBill),
                        type: 'line',
                        borderColor: '#e65100',
                        backgroundColor: 'rgba(230,81,0,0.08)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'yBill',
                        order: 1,
                        datalabels: { anchor: 'end', align: 'top', offset: 6, color: '#e65100', font: { size: labelSize, weight: '600' }, formatter: function (v) { return '\u20B9' + (v % 1 === 0 ? v : v.toFixed(0)); } }
                    }
                ]
            },
            options: {
                ...baseOptions,
                layout: { padding: { top: 30, right: 10 } },
                scales: {
                    y: { title: { display: !isMobile, text: 'Units' }, position: 'left' },
                    yBill: { title: { display: !isMobile, text: 'Bill (Rs)' }, position: 'right', grid: { drawOnChartArea: false } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: labelSize } } },
                    datalabels: { font: { size: labelSize, weight: '600' } }
                }
            }
        });

        charts.acUsage = new Chart($('chartACUsage'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Aaditya AC', data: sorted.map(h => h.ac1), backgroundColor: '#1976d2' },
                    { label: 'Kishore AC', data: sorted.map(h => h.ac2), backgroundColor: '#42a5f5' },
                    { label: 'Palani AC', data: sorted.map(h => h.ac3), backgroundColor: '#90caf9' }
                ]
            },
            options: {
                ...baseOptions,
                layout: chartLayout,
                scales: { x: { stacked: true }, y: { stacked: true } },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: labelSize } } },
                    datalabels: { anchor: 'center', align: 'center', font: { size: labelSize, weight: '600' }, color: '#fff', formatter: function (v) { return v % 1 === 0 ? v : v.toFixed(0); } }
                }
            }
        });

        function userChart(canvasId, name, acKey, amountKey, color) {
            return new Chart($(canvasId), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: name + ' AC Units',
                            data: sorted.map(h => h[acKey]),
                            backgroundColor: color,
                            order: 2,
                            datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { size: isMobile ? 10 : 12, weight: '700' }, formatter: function (v) { return (v % 1 === 0 ? v : v.toFixed(0)) + ' u'; } }
                        },
                        {
                            label: name + ' AC Bill',
                            data: sorted.map(h => parseFloat((h[acKey] * h.perUnitRate).toFixed(2))),
                            type: 'line',
                            borderColor: '#e65100',
                            backgroundColor: 'rgba(230,81,0,0.08)',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'yBill',
                            order: 1,
                            datalabels: { anchor: 'end', align: 'top', offset: 6, color: '#e65100', font: { size: labelSize, weight: '600' }, formatter: function (v) { return '\u20B9' + (v % 1 === 0 ? v : v.toFixed(0)); } }
                        }
                    ]
                },
                options: {
                    ...baseOptions,
                    layout: { padding: { top: 30, right: 10 } },
                    scales: {
                        y: { title: { display: !isMobile, text: 'Units' }, position: 'left' },
                        yBill: { title: { display: !isMobile, text: 'Bill (Rs)' }, position: 'right', grid: { drawOnChartArea: false } }
                    },
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, font: { size: labelSize } } },
                        datalabels: { font: { size: labelSize, weight: '600' } }
                    }
                }
            });
        }

        charts.aaditya = userChart('chartAaditya', 'Aaditya', 'ac1', 'person1Amount', '#1976d2');
        charts.kishore = userChart('chartKishore', 'Kishore', 'ac2', 'person2Amount', '#42a5f5');
        charts.palani = userChart('chartPalani', 'Palani', 'ac3', 'person3Amount', '#90caf9');

        charts.common = new Chart($('chartCommon'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Common Units',
                        data: sorted.map(h => h.commonUnits),
                        backgroundColor: '#ff9800',
                        order: 2,
                        datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { size: isMobile ? 10 : 12, weight: '700' }, formatter: function (v) { return (v % 1 === 0 ? v : v.toFixed(0)) + ' u'; } }
                    },
                    {
                        label: 'Common Bill',
                        data: sorted.map(h => parseFloat((h.commonUnits * h.perUnitRate).toFixed(2))),
                        type: 'line',
                        borderColor: '#e65100',
                        backgroundColor: 'rgba(230,81,0,0.08)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'yBill',
                        order: 1,
                        datalabels: { anchor: 'end', align: 'top', offset: 6, color: '#e65100', font: { size: labelSize, weight: '600' }, formatter: function (v) { return '\u20B9' + (v % 1 === 0 ? v : v.toFixed(0)); } }
                    }
                ]
            },
            options: {
                ...baseOptions,
                layout: { padding: { top: 30, right: 10 } },
                scales: {
                    y: { title: { display: !isMobile, text: 'Units' }, position: 'left' },
                    yBill: { title: { display: !isMobile, text: 'Bill (Rs)' }, position: 'right', grid: { drawOnChartArea: false } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: labelSize } } },
                    datalabels: { font: { size: labelSize, weight: '600' } }
                }
            }
        });

        $('chartsSection').classList.remove('hidden');
    }

    window.app = { viewRecord: viewRecord, deleteRecord: deleteRecord };
})();
