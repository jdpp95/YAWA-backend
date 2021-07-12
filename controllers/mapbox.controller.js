const axios = require('axios');

const mapbox = async (req, res) => {
    const searchTerm = req.query.q;
    const accessToken = process.env.MAPBOX;

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchTerm}.json?access_token=${accessToken}`;
    await callMapboxAPI(url, res);
}

const callMapboxAPI = async(baseURL, res) => {
    try {
        const instance = axios.create({
            baseURL,
        });

        const response = await instance.get();

        const place = response.data.features.map(place => ({
            id: place.id,
            name: place.place_name,
            lng: place.center[0],
            lat: place.center[1]
        }))

        res.json(place);
    } catch (error) {
        console.log(error)
        res.status(400).json({
            error
        })
    }
}

module.exports = {
    mapbox
}