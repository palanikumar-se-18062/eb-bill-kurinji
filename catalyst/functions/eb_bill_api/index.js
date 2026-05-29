const catalyst = require('zcatalyst-sdk-node');

const TABLE_NAME = 'eb_bills';

module.exports = async (context, basicIO) => {
    const app = catalyst.initialize(context);
    const zcql = app.zcql();
    const table = app.datastore().table(TABLE_NAME);

    const action = basicIO.getArgument('action') || '';

    try {
        if (action === 'list') {
            const result = await zcql.executeZCQLQuery(`SELECT * FROM ${TABLE_NAME}`);
            const records = (result || []).map(r => mapRowToRecord(r[TABLE_NAME]));
            records.sort((a, b) => b.month.localeCompare(a.month));
            basicIO.write(JSON.stringify({ success: true, data: records }));

        } else if (action === 'get') {
            const month = basicIO.getArgument('month');
            if (!month) {
                basicIO.write(JSON.stringify({ success: false, error: 'month param required' }));
                context.close();
                return;
            }
            const result = await zcql.executeZCQLQuery(
                `SELECT * FROM ${TABLE_NAME} WHERE bill_month = '${month}'`
            );
            if (result && result.length > 0) {
                basicIO.write(JSON.stringify({ success: true, data: mapRowToRecord(result[0][TABLE_NAME]) }));
            } else {
                basicIO.write(JSON.stringify({ success: false, error: 'Not found' }));
            }

        } else if (action === 'save') {
            const month = basicIO.getArgument('month');
            const totalUnits = parseFloat(basicIO.getArgument('totalUnits'));
            const totalBill = parseFloat(basicIO.getArgument('totalBill'));

            if (!month || !totalUnits || !totalBill) {
                basicIO.write(JSON.stringify({ success: false, error: 'Invalid data' }));
                context.close();
                return;
            }

            const perUnitRate = parseFloat(basicIO.getArgument('perUnitRate')) || 0;
            const ac1 = parseFloat(basicIO.getArgument('ac1')) || 0;
            const ac2 = parseFloat(basicIO.getArgument('ac2')) || 0;
            const ac3 = parseFloat(basicIO.getArgument('ac3')) || 0;
            const commonUnits = parseFloat(basicIO.getArgument('commonUnits')) || 0;
            const person1Amount = parseFloat(basicIO.getArgument('person1Amount')) || 0;
            const person2Amount = parseFloat(basicIO.getArgument('person2Amount')) || 0;
            const person3Amount = parseFloat(basicIO.getArgument('person3Amount')) || 0;

            const existing = await zcql.executeZCQLQuery(
                `SELECT ROWID FROM ${TABLE_NAME} WHERE bill_month = '${month}'`
            );

            const rowData = {
                bill_month: month,
                total_units: totalUnits,
                total_bill: totalBill,
                per_unit_rate: perUnitRate,
                ac1_units: ac1,
                ac2_units: ac2,
                ac3_units: ac3,
                common_units: commonUnits,
                person1_amount: person1Amount,
                person2_amount: person2Amount,
                person3_amount: person3Amount
            };

            if (existing && existing.length > 0) {
                rowData.ROWID = existing[0][TABLE_NAME].ROWID;
                const updated = await table.updateRow(rowData);
                basicIO.write(JSON.stringify({ success: true, action: 'updated', data: mapRowToRecord(updated) }));
            } else {
                rowData.id = Date.now();
                const inserted = await table.insertRow(rowData);
                basicIO.write(JSON.stringify({ success: true, action: 'inserted', data: mapRowToRecord(inserted) }));
            }

        } else if (action === 'delete') {
            const month = basicIO.getArgument('month');
            if (!month) {
                basicIO.write(JSON.stringify({ success: false, error: 'month required' }));
                context.close();
                return;
            }
            const existing = await zcql.executeZCQLQuery(
                `SELECT ROWID FROM ${TABLE_NAME} WHERE bill_month = '${month}'`
            );
            if (existing && existing.length > 0) {
                await table.deleteRow(existing[0][TABLE_NAME].ROWID);
                basicIO.write(JSON.stringify({ success: true, action: 'deleted' }));
            } else {
                basicIO.write(JSON.stringify({ success: false, error: 'Not found' }));
            }

        } else {
            basicIO.write(JSON.stringify({ success: false, error: 'Invalid action' }));
        }
    } catch (err) {
        basicIO.write(JSON.stringify({ success: false, error: err.message || 'Server error' }));
    }
    context.close();
};

function mapRowToRecord(row) {
    return {
        month: row.bill_month,
        totalUnits: parseFloat(row.total_units),
        totalBill: parseFloat(row.total_bill),
        perUnitRate: parseFloat(row.per_unit_rate),
        ac1: parseFloat(row.ac1_units),
        ac2: parseFloat(row.ac2_units),
        ac3: parseFloat(row.ac3_units),
        commonUnits: parseFloat(row.common_units),
        person1Amount: parseFloat(row.person1_amount),
        person2Amount: parseFloat(row.person2_amount),
        person3Amount: parseFloat(row.person3_amount),
        createdAt: row.CREATEDTIME || ''
    };
}
