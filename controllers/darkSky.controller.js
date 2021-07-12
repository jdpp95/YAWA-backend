const axios = require('axios');

const darkSky = async (req, res) => {
    
    let { coords, lat, long, time, timestamp } = req.query;

    const darkSkyUrl = "https://api.darksky.net/forecast";
    const darkSkyKey = process.env.DARK_SKY;

    let baseURL = `${darkSkyUrl}/${darkSkyKey}/`;
    if(coords){
        baseURL += `${coords}`;
    } else {
        baseURL += `${lat},${long}`;
    }
    
    if(time && timestamp){
        res.status(400).json({
            error: "Please don't send time and timestamp simultaneously"
        })
    }

    if(time){
        baseURL += `,${time}`
    }

    if(timestamp){
        baseURL += `,${timestamp}`
    }

    //TODO: Refactor into a new method
    try {
        const instance = axios.create({
            baseURL,
            params: {units: 'ca'}
        });

        const response = await instance.get();

        res.json(response.data);
    } catch (error) {
        console.log(error)
        res.status(400).json({
            error
        })
    }
}

module.exports = {
    darkSky
}