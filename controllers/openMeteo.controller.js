const axios = require("axios");
const { getSunAngleFromTime, getSunAngleFromTimestamp } = require("../utils/getSunAngleFromTime");

const openMeteo = async (req, res) => {
    let { coords, lat, long, time, timestamp, utc } = req.query;

    const openMeteoUrl = "https://api.open-meteo.com/v1/forecast";

    // https://api.open-meteo.com/v1/forecast?latitude=4.6111&longitude=-74.21&hourly=temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,precipitation,snow_depth,cloudcover,visibility,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&current_weather=true&timezone=America%2FNew_York

    // If time or timestamp are not included on the request, assume that the current weather is requested.
    let currentWeather = !time && !timestamp;
    if (currentWeather) {
        const isoDate = new Date().toISOString();
        sunAngle = getSunAngleFromTime(isoDate, lat, long, utc);
    }

    try {
        const instance = axios.create({
            baseURL: openMeteoUrl,
            params: {
                latitude: lat,
                longitude: long,
                hourly: "temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,precipitation,snow_depth,cloudcover,visibility,windspeed_10m",
                daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
                current_weather: currentWeather,
                timezone: "auto"
            }
        });

        const apiResponse = await instance.get();

        // Get metadata from response

        // TODO: What if current_weather is not there?
        let localTimeISO = apiResponse.data.current_weather.time;
        let localHour = new Date(localTimeISO).getHours();

        // Build response
        const response = { data: {} };

        response.data.sunAngle = sunAngle;
        response.data.currently = {
            temperature: apiResponse.data.current_weather.temperature,
            humidity: apiResponse.data.hourly.relativehumidity_2m[localHour]/100,
            dewPoint: apiResponse.data.hourly.dewpoint_2m[localHour],
            cloudCover: apiResponse.data.hourly.cloudcover[localHour],
            // summary: "Fair",
            windSpeed: apiResponse.data.hourly.windspeed_10m[localHour],
            visibility: apiResponse.data.hourly.visibility[localHour]/1000,
            precipIntensity: apiResponse.data.hourly.precipitation[localHour],
            apparentTemperature: apiResponse.data.hourly.apparent_temperature[localHour]
        };

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
        // response.data.hourly.data.forEach((item) => {
        //     let sunAngle = getSunAngleFromTimestamp(item.time, lat, long, utc);
        //     item.sunAngle = sunAngle;
        // });

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