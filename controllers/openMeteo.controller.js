const axios = require("axios");
const moment = require('moment');
const { getSunAngleFromTime, getSunAngleFromTimestamp } = require("../utils/getSunAngleFromTime");
const { transition } = require("../utils/transition.js");
const { computeIndoorTemperature } = require("../utils/computeIndoorTemperature.js");

const openMeteo = async (req, res) => {
    let {
        coords,
        lat,
        long,
        time,
        timestamp,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        utc
    } = req.query;

    const openMeteoForecastUrl = "https://api.open-meteo.com/v1/forecast";
    const openMeteoHistoryUrl = "https://archive-api.open-meteo.com/v1/archive";

    // If time or timestamp are not included on the request, assume that the current weather is being requested.
    let currentWeather = !time && !timestamp && !startTimestamp && !endTimestamp;
    if (currentWeather) {
        const isoDate = new Date().toISOString();
        sunAngle = getSunAngleFromTime(isoDate, lat, long, utc);
    } else {
        sunAngle = getSunAngleFromTimestamp(timestamp, lat, long, utc);
    }

    let isoDateStart, isoDateEnd, date;
    if (timestamp) {
        //Get start date
        date = moment(timestamp * 1000).subtract(1, 'day');
        isoDateStart = date.format("YYYY-MM-DD");

        //Get finish date
        date.add(2, 'day')
        isoDateEnd = date.format("YYYY-MM-DD");

        //Return date back to its original value
        date.subtract(1, 'day')
    } else if (startTimestamp && endTimestamp) {
        //Get start date
        date = moment(startTimestamp * 1000);
        isoDateStart = date.format("YYYY-MM-DD");

        //Get finish date
        date = moment(endTimestamp * 1000);
        isoDateEnd = date.format("YYYY-MM-DD");

        //Return date back to its original value
        // date.subtract(1, 'day')
    } else if (time) {
        res.status(501).json("Time in ISO format parsing has not been implemented yet")
    }

    try {
        let currentWeatherPastDays = 7;

        const currentWeatherParams = {
            baseURL: openMeteoForecastUrl,
            params: {
                latitude: lat,
                longitude: long,
                hourly: "temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,precipitation,snow_depth,cloudcover,visibility,windspeed_10m",
                daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
                current_weather: true,
                timezone: "auto",
                past_days: currentWeatherPastDays,
                timeformat: "unixtime"
            }
        };

        const historicalWeatherParams = {
            baseURL: openMeteoHistoryUrl,
            params: {
                latitude: lat,
                longitude: long,
                start_date: isoDateStart,
                end_date: isoDateEnd,
                hourly: "temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,precipitation,cloudcover,windspeed_10m",
                daily: "temperature_2m_max,temperature_2m_min,temperature_2m_mean,sunrise,sunset",
                timezone: "auto",
                timeformat: "unixtime"
            }
        }

        // If the provided data is older than 7 days the historical API will be
        // used, otherwise, the forecast API will bring the data from the
        // last 7 days
        let isHistorical = (() => {
            // If the date is not provided assume that current data is being requested.
            if (!date) return false;

            let oneWeekAgo = moment().subtract(7, 'days');
            return date.isBefore(oneWeekAgo);
        })();

        const instance = axios.create(isHistorical ? historicalWeatherParams : currentWeatherParams);

        const apiResponse = await instance.get();

        // Get metadata from response

        let utc = apiResponse.data.utc_offset_seconds / 3600;

        let localHour;

        if (currentWeather) {
            let localTimeISO = apiResponse.data.current_weather.time;
            localHour = new Date(localTimeISO).getHours();
        } else {
            localHour = date.utcOffset(utc).hour();
        }

        // Build response
        let response = { data: {} };

        response = {
            ...response,
            data: {
                ...response.data,
                latitude: apiResponse.data.latitude,
                longitude: apiResponse.data.longitude,
                elevation: apiResponse.data.elevation,
                sunAngle: sunAngle
            }
        };

        if (currentWeather || (startTimestamp && endTimestamp)) {

            if (currentWeather) {
                response.data.currently = {
                    temperature: apiResponse.data.current_weather.temperature,
                    humidity: apiResponse.data.hourly.relativehumidity_2m[localHour] / 100,
                    dewPoint: apiResponse.data.hourly.dewpoint_2m[localHour],
                    cloudCover: apiResponse.data.hourly.cloudcover[localHour] / 100,
                    windSpeed: apiResponse.data.hourly.windspeed_10m[localHour],
                    visibility: apiResponse.data.hourly.visibility[localHour] / 1000,
                    precipIntensity: apiResponse.data.hourly.precipitation[localHour],
                    apparentTemperature: apiResponse.data.hourly.apparent_temperature[localHour]
                }
            }

            response.data.hourly = { data: [] };
            apiResponse.data.hourly.time.forEach((unixTime, index) => {

                let isWithinRange = false;

                if (startTimestamp && endTimestamp) {
                    isWithinRange = unixTime >= startTimestamp && unixTime <= endTimestamp;
                }

                if (timestamp) {
                    // TODO: Last 24 hours 
                }

                if (isWithinRange) {
                    response.data.hourly.data.push({
                        time: unixTime,
                        temperature: apiResponse.data.hourly.temperature_2m[index],
                        humidity: apiResponse.data.hourly.relativehumidity_2m[index] / 100,
                        dewPoint: apiResponse.data.hourly.dewpoint_2m[index],
                        cloudCover: apiResponse.data.hourly.cloudcover[index] / 100,
                        precipIntensity: apiResponse.data.hourly.precipitation[index],
                        windSpeed: apiResponse.data.hourly.windspeed_10m[index],
                        apparentTemperature: apiResponse.data.hourly.apparent_temperature[index],
                        sunAngle: getSunAngleFromTimestamp(unixTime, lat, long, utc)
                    });
                }
            });
        } else {
            // Display the data which spans from local date at 0h to local date at 23h
            response.data.hourly = { data: [] }

            const thermodynamics = {
                left: {
                    increaseFactor: 0.15,
                    decreaseFactor: 0.015
                },
                right: {
                    increaseFactor: 0.45,
                    decreaseFactor: 0.07
                }
            };
            let lowerIndex, upperIndex = -1, minutesPassed = -1;
            let indoorTemp = { left: null, right: null };
            let previousIndoorTemp = { left: null, right: null };
            const now = moment().unix();
            apiResponse.data.hourly.time.forEach((unixTime, index) => {
                if (unixTime <= now) {
                    const currentTemperature = apiResponse.data.hourly.temperature_2m[index]
                    if (indoorTemp.left === null) {
                        previousIndoorTemp = { left: currentTemperature, right: currentTemperature };
                    } else {
                        previousIndoorTemp = { ...indoorTemp };
                    }
                    indoorTemp.left = computeIndoorTemperature(
                        currentTemperature, 
                        previousIndoorTemp.left, 
                        thermodynamics.left.decreaseFactor, 
                        thermodynamics.left.increaseFactor
                    );
                    indoorTemp.right = computeIndoorTemperature(
                        currentTemperature, 
                        previousIndoorTemp.right, 
                        thermodynamics.right.decreaseFactor, 
                        thermodynamics.right.increaseFactor
                    );
                }
                response.data.hourly.data.push({
                    time: unixTime,
                    temperature: apiResponse.data.hourly.temperature_2m[index],
                    apparentTemperature: apiResponse.data.hourly.apparent_temperature[index],
                    humidity: apiResponse.data.hourly.relativehumidity_2m[index] / 100,
                    dewPoint: apiResponse.data.hourly.dewpoint_2m[index],
                    cloudCover: apiResponse.data.hourly.cloudcover[index] / 100,
                    precipIntensity: apiResponse.data.hourly.precipitation[index],
                    windSpeed: apiResponse.data.hourly.windspeed_10m[index],
                    sunAngle: getSunAngleFromTimestamp(unixTime, lat, long, utc)
                });

                if (upperIndex === -1 && unixTime > timestamp) {
                    upperIndex = index;
                    lowerIndex = upperIndex - 1;
                    minutesPassed = 60 - (unixTime - timestamp) / 60;
                }
            });

            // Get data from upper and lower hour and make and average based on the minute
            let lowerIndexItem = response.data.hourly.data[lowerIndex];
            let upperIndexItem = response.data.hourly.data[upperIndex];

            response.data.currently = {
                temperature: transition(lowerIndexItem.temperature, upperIndexItem.temperature, 0, 60, minutesPassed),
                humidity: transition(lowerIndexItem.humidity, upperIndexItem.humidity, 0, 60, minutesPassed),
                dewPoint: transition(lowerIndexItem.dewPoint, upperIndexItem.dewPoint, 0, 60, minutesPassed),
                cloudCover: transition(lowerIndexItem.cloudCover, upperIndexItem.cloudCover, 0, 60, minutesPassed),
                windSpeed: transition(lowerIndexItem.windSpeed, upperIndexItem.windSpeed, 0, 60, minutesPassed),
                precipIntensity: transition(lowerIndexItem.precipIntensity, upperIndexItem.precipIntensity, 0, 60, minutesPassed),
                apparentTemperature: transition(lowerIndexItem.apparentTemperature, upperIndexItem.apparentTemperature, 0, 60, minutesPassed),
                indoorTemp
            }
        }

        response.data.daily = {
            data: [
                {
                    temperatureMin: apiResponse.data.daily.temperature_2m_min[0],
                    temperatureMax: apiResponse.data.daily.temperature_2m_max[0],
                    // precipIntensityMax: 3.5,
                    // precipIntensityMaxTime: "20230902T15:30"
                }
            ]
        }

        res.json(response.data);
    } catch (error) {
        console.log(error)
        res.status(400).json({
            error
        })
    }
}

module.exports = {
    openMeteo
}