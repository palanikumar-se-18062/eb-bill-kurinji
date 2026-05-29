(function () {
    'use strict';

    const STORAGE_KEY = 'eb_bill_history';
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let currentCalc = null;
    let charts = { trend: null, consumption: null, acUsage: null, aaditya: null, kishore: null, palani: null };
    let confirmCallback = null;

    // DOM refs
    const $ = (id) => document.getElementById(id);
    const monthInput = $('month');
    const totalUnitsInput = $('totalUnits');
    const totalBillInput = $('totalBill');
    const ac1Input = $('ac1');
    const ac2Input = $('ac2');
    const ac3Input = $('ac3');

    // Month Picker State
    let pickerYear = new Date().getFullYear();
    let pickerMonth = new Date().getMonth();
    const monthDisplay = $('monthDisplay');
    const monthDropdown = $('monthDropdown');
    const monthGrid = $('monthGrid');

    // Init
    setDefaultMonth();
    initMonthPicker();
    initRouter();

    // Events
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

    // Router
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

    // Month Picker
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

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        const commonUnits = v.totalUnits - (v.ac1 + v.ac2 + v.ac3);
        const commonPerPerson = commonUnits / 3;

        const person1 = (v.ac1 + commonPerPerson) * perUnitRate;
        const person2 = (v.ac2 + commonPerPerson) * perUnitRate;
        const person3 = (v.ac3 + commonPerPerson) * perUnitRate;

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
        $('summaryCommon').textContent = c.commonUnits + ' Units';
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
                '<div class="breakdown-row"><span>AC Units</span><span>' + r.ac + '</span></div>' +
                '<div class="breakdown-row"><span>AC Charge</span><span>\u20B9' + acCharge.toFixed(2) + '</span></div>' +
                '<div class="breakdown-row"><span>Common Charge</span><span>\u20B9' + commonCharge.toFixed(2) + '</span></div>' +
                '<div class="breakdown-total"><span>Total Payable</span><span>\u20B9' + r.amount.toFixed(2) + '</span></div>' +
                '</div>';
        }).join('');

        $('resultSection').classList.remove('hidden');
    }

    // Copy
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
            'Common Units: ' + c.commonUnits + ' (' + commonPerPerson.toFixed(2) + '/person)',
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

    function saveMonth() {
        if (!currentCalc) return;

        const history = getHistory();
        const idx = history.findIndex(h => h.month === currentCalc.month);
        if (idx !== -1) {
            showConfirm('Data for ' + formatMonth(currentCalc.month) + ' already exists. Overwrite?', () => {
                history[idx] = currentCalc;
                history.sort((a, b) => b.month.localeCompare(a.month));
                saveHistory(history);
                renderHistory();
                $('btnSave').disabled = true;
                showToast('Month saved');
            });
        } else {
            history.push(currentCalc);
            history.sort((a, b) => b.month.localeCompare(a.month));
            saveHistory(history);
            renderHistory();
            $('btnSave').disabled = true;
            showToast('Month saved');
        }
    }

    function formatMonth(m) {
        const [y, mo] = m.split('-');
        return MONTH_NAMES[parseInt(mo, 10) - 1] + ' ' + y;
    }

    function renderHistory() {
        const history = getHistory();
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
            '<td>' + h.totalUnits + '</td>' +
            '<td>\u20B9' + h.totalBill.toFixed(0) + '</td>' +
            '<td>' + h.ac1 + '</td>' +
            '<td>' + h.ac2 + '</td>' +
            '<td>' + h.ac3 + '</td>' +
            '<td>\u20B9' + h.perUnitRate.toFixed(2) + '</td>' +
            '<td>\u20B9' + h.person1Amount.toFixed(0) + '</td>' +
            '<td>\u20B9' + h.person2Amount.toFixed(0) + '</td>' +
            '<td>\u20B9' + h.person3Amount.toFixed(0) + '</td>' +
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
        const history = getHistory();
        const h = history[idx];
        if (!h) return;

        $('viewTitle').textContent = formatMonth(h.month) + ' - Bill Details';
        const commonPerPerson = h.commonUnits / 3;

        const row = (label, val) =>
            '<div class="breakdown-row"><span>' + label + '</span><span>' + val + '</span></div>';

        $('viewContent').innerHTML =
            row('Total Units', h.totalUnits) +
            row('Total Bill', '\u20B9' + h.totalBill.toFixed(2)) +
            row('Per Unit Rate', '\u20B9' + h.perUnitRate.toFixed(2)) +
            row('Common Units', h.commonUnits.toFixed(2)) +
            row('Common/Person', commonPerPerson.toFixed(2) + ' units') +
            '<hr style="margin:12px 0;border:none;border-top:1px solid #e0e0e0">' +
            row('Aaditya (AC: ' + h.ac1 + ')', '\u20B9' + h.person1Amount.toFixed(2)) +
            row('Kishore (AC: ' + h.ac2 + ')', '\u20B9' + h.person2Amount.toFixed(2)) +
            row('Palani (AC: ' + h.ac3 + ')', '\u20B9' + h.person3Amount.toFixed(2));

        $('viewOverlay').classList.remove('hidden');
    }

    function deleteRecord(idx) {
        const history = getHistory();
        const h = history[idx];
        if (!h) return;

        showConfirm('Delete record for ' + formatMonth(h.month) + '?', () => {
            history.splice(idx, 1);
            saveHistory(history);
            renderHistory();
            showToast('Record deleted');
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
        const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
        const labels = sorted.map(h => formatMonth(h.month));

        if (charts.trend) charts.trend.destroy();
        if (charts.consumption) charts.consumption.destroy();
        if (charts.acUsage) charts.acUsage.destroy();
        if (charts.aaditya) charts.aaditya.destroy();
        if (charts.kishore) charts.kishore.destroy();
        if (charts.palani) charts.palani.destroy();

        charts.trend = new Chart($('chartBillTrend'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Bill (\u20B9)',
                    data: sorted.map(h => h.totalBill),
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25,118,210,0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        charts.consumption = new Chart($('chartUnitConsumption'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Units',
                    data: sorted.map(h => h.totalUnits),
                    backgroundColor: '#42a5f5'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
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
                responsive: true,
                scales: { x: { stacked: true }, y: { stacked: true } }
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
                            order: 2
                        },
                        {
                            label: name + ' AC Bill',
                            data: sorted.map(h => h[acKey] * h.perUnitRate),
                            type: 'line',
                            borderColor: '#d32f2f',
                            backgroundColor: 'rgba(211,47,47,0.1)',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'yBill',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { title: { display: true, text: 'Units' }, position: 'left' },
                        yBill: { title: { display: true, text: 'Bill (Rs)' }, position: 'right', grid: { drawOnChartArea: false } }
                    }
                }
            });
        }

        charts.aaditya = userChart('chartAaditya', 'Aaditya', 'ac1', 'person1Amount', '#1976d2');
        charts.kishore = userChart('chartKishore', 'Kishore', 'ac2', 'person2Amount', '#42a5f5');
        charts.palani = userChart('chartPalani', 'Palani', 'ac3', 'person3Amount', '#90caf9');

        $('chartsSection').classList.remove('hidden');
    }

    window.app = { viewRecord: viewRecord, deleteRecord: deleteRecord };
})();
