# In utils/geocoding.py
from geopy.geocoders import Nominatim

async def get_coordinates(address: str):
    geolocator = Nominatim(user_agent="touristapp")
    location = await geolocator.geocode(address)
    return (location.latitude, location.longitude)