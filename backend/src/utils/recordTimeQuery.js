const { Op, literal } = require('sequelize');

const EFFECTIVE_TIME_SQL = 'COALESCE(datetime, timestamp)';

/**
 * Index-friendly time range: uses datetime index when present, timestamp for null-datetime rows.
 */
function effectiveTimeBetweenClause(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return {
        [Op.or]: [
            { datetime: { [Op.between]: [start, end] } },
            {
                [Op.and]: [
                    { datetime: null },
                    { timestamp: { [Op.between]: [start, end] } }
                ]
            }
        ]
    };
}

function effectiveTimeGteClause(date) {
    const since = new Date(date);
    return {
        [Op.or]: [
            { datetime: { [Op.gte]: since } },
            {
                [Op.and]: [
                    { datetime: null },
                    { timestamp: { [Op.gte]: since } }
                ]
            }
        ]
    };
}

function effectiveTimeOrderDesc() {
    return [['datetime', 'DESC'], ['timestamp', 'DESC'], ['id', 'DESC']];
}

function effectiveTimeOrderAsc() {
    return [['datetime', 'ASC'], ['timestamp', 'ASC'], ['id', 'ASC']];
}

function mergeWhereClause(baseWhere, clause) {
    const next = { ...baseWhere };
    if (next[Op.and]) {
        next[Op.and] = [...next[Op.and], clause];
    } else {
        next[Op.and] = [clause];
    }
    delete next.datetime;
    return next;
}

function appendTimeRangeFilter(where, startDate, endDate) {
    if (!startDate || !endDate) {
        return where;
    }
    return mergeWhereClause(where, effectiveTimeBetweenClause(startDate, endDate));
}

function appendTimeGteFilter(where, sinceDate) {
    if (!sinceDate) {
        return where;
    }
    return mergeWhereClause(where, effectiveTimeGteClause(sinceDate));
}

/**
 * Fetch up to `limit` newest tracking points, returned in chronological order for map paths.
 */
async function findTrackingRecordsChronological(Record, {
    where: baseWhere = {},
    startDate,
    endDate,
    limit,
    attributes
}) {
    const where = appendTimeRangeFilter({ ...baseWhere }, startDate, endDate);
    const rows = await Record.findAll({
        where,
        attributes,
        order: effectiveTimeOrderDesc(),
        limit
    });
    return rows.reverse();
}

module.exports = {
    EFFECTIVE_TIME_SQL,
    effectiveTimeBetweenClause,
    effectiveTimeGteClause,
    effectiveTimeOrderDesc,
    effectiveTimeOrderAsc,
    appendTimeRangeFilter,
    appendTimeGteFilter,
    findTrackingRecordsChronological
};
