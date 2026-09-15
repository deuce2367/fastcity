with open("static/app.js", "r") as f:
    content = f.read()

old_mouse = """// Track mouse coordinates over map
map.on('mousemove', (e) => {
    latVal.textContent = e.latlng.lat.toFixed(4);
    lonVal.textContent = e.latlng.lng.toFixed(4);
});"""

new_mouse = """// Track mouse coordinates over map
map.on('mousemove', (e) => {
    const wrapped = e.latlng.wrap();
    latVal.textContent = wrapped.lat.toFixed(4);
    lonVal.textContent = wrapped.lng.toFixed(4);
});"""

old_click = """// Handle map click
map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    fetchNearestCities(lat, lng);
});"""

new_click = """// Handle map click
map.on('click', (e) => {
    const wrapped = e.latlng.wrap();
    fetchNearestCities(wrapped.lat, wrapped.lng);
});"""

content = content.replace(old_mouse, new_mouse)
content = content.replace(old_click, new_click)

with open("static/app.js", "w") as f:
    f.write(content)
