const TO_RADIANS = Math.PI / 180;
const TO_DEGREES = 180 / Math.PI;

const getSunAngleFromTime = (time, latitude, longitude, utc) => {
    const unixDate = Date.parse(time)/1000;
    return getSunAngleFromTimestamp(unixDate, latitude, longitude, utc);
};

const getSunAngleFromTimestamp = (timestamp, latitude, longitude, utc) => {
    latitude *= TO_RADIANS;

    const date = new Date(timestamp*1000);
    let dayOfYear = getDayOfYear(date);

    let declination = getDeclination(dayOfYear) * TO_RADIANS;
    let localTime = date.getUTCHours() + utc*1 + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    let hourAngle = getHourAngle(longitude, dayOfYear, localTime, utc) * TO_RADIANS;

    return Math.asin(Math.sin(declination) * Math.sin(latitude) 
        + Math.cos(declination) * Math.cos(latitude) * Math.cos(hourAngle)) * TO_DEGREES;
}

const getDayOfYear = (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    return day;
}

const getDeclination = (dayOfYear) => {
    return -23.45 * Math.cos((2 * Math.PI/365) * (dayOfYear + 10));
}

const getHourAngle = (longitude, dayOfYear, localTime, utc) => {
    let b = (2.0 * Math.PI/365)*(dayOfYear - 81);
    let equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    let localStandardTimeMeridian = 15 * utc;
    let timeCorrection = 4*(longitude - localStandardTimeMeridian) + equationOfTime;
    let localSolarTime = localTime + timeCorrection / 60;

    return 15 * (localSolarTime - 12);
}

module.exports = {
    getSunAngleFromTime,
    getSunAngleFromTimestamp
};
