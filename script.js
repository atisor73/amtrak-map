let svg;
let backgroundImage = null;
let routes = null;
let routeData = null;
let selectedRoute = null;

// Load the external SVG file
Promise.all([
    d3.xml("map.svg"),
    d3.csv("data/routes_03012026.csv")
]).then(([svgData, csvData]) => {
// d3.xml("map.svg").then(data => {
    const container = d3.select("#map-container");

    // Append the SVG element to the container
    container.node().append(svgData.documentElement);

    // Select the loaded SVG
    svg = d3.select("#map-container svg")
                .attr("id", "amtrak-svg")
                .attr("preserveAspectRatio", "xMidYMid meet");

    console.log("SVG loaded:", svg);

    // Slider: Select image and chnage opacity of underlying image
    backgroundImage = svg.select("image");
    // ... set initial opacity
    const initialOpacity = d3.select("#opacity-slider").property("value");
    if (backgroundImage) {
        backgroundImage.attr("opacity", initialOpacity);
    }
    console.log("Found image:", backgroundImage.node());

    // Toggle: Show/hide routes
    routes = svg.selectAll("g[id^='route']");
    console.log("Routes found:", routes.size());

    let selectedRoute = null;

    

    // Load routes csv for tooltips
    // Convert numeric columns if needed
    csvData.forEach(d => {
        d.n_stations_approx = +d.n_stations_approx;
        d.time = +d.time;
        d.miles_approx = +d.miles_approx;
    });

    // Index by route for fast access
    routeData = {};
    csvData.forEach(d => {
        routeData[d.route] = d;
    });

    console.log("Routes loaded:", routeData);


    setupSlider();
    setupToggle();
    setupRouteClick();
    setupResetClick();

    
    // End
}).catch(err => console.error("Error loading SVG or CSV:", err));





// ----------------- FUNCTIONS ----------------- 


function setupSlider() {
    d3.select("#opacity-slider").on("input", function () {
        const val = this.value;
        if (backgroundImage) {
            backgroundImage.attr("opacity", val);
        }

    });
}

function setupToggle() {
    d3.select("#toggle-routes").on("change", function () {

        const checked = this.checked;
        if (routes) {
            routes.attr("display", checked ? null : "none");
        }

    });
}

function setupRouteClick() {
    
    routes.style("cursor", "pointer");

    routes.on("click", function (event) {
        event.stopPropagation(); // prevent reset click
        const clicked = d3.select(this);
        selectedRoute = this.id;
        // // fade all
        routes.attr("opacity", 0.1);
        // routes.attr("stroke", "#b0b0b0");

        // // highlight clicked
        clicked.attr("opacity", 1);
        // clicked.attr("stroke", null);

        // show tooltip
        selectedRouteName = selectedRoute.replace(/^route_/,""); // remove prefix
        showTooltip(routeData[selectedRouteName], event.pageX, event.pageY);
    })
};


function setupResetClick() {
    svg.on("click", function () {
        selectedRoute = null;
        routes.attr("opacity", 1);
        routes.attr("stroke", null);

        hideTooltip();
    });

}


// Show tooltip at mouse position
function showTooltip(info, x, y) {
    // Remove any existing tooltip
    d3.select(".tooltip").remove();

    // Create tooltip container
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("left", `${x + 20}px`)
        .style("top", `${y + 10}px`);

    // Build table
    const tbody = tooltip.append("table").append("tbody");

    // Only the fields we want
    
    const fields = [
        {key:"origin", label:"Origin"},
        {key:"destination", label:"Destination"},
        {key:"frequency", label:"Frequency"},
        {key:"time_label", label:"Duration"},
        {key:"miles_approx_label", label:"Miles"},
        {key:"stop_summary", label:"Stop summary"},
        {key:"link", label:"Link", isLink:true}       // optional: can be clickable later
    ];

    fields.forEach(f => {
        if (info[f.key] !== undefined && info[f.key] !== "") {
            let value = info[f.key] + (f.suffix || "");
            // If it's a link, wrap in <a>
            if (f.isLink) {
                value = `<a href="${info[f.key]}" target="_blank">${info[f.key]}</a>`;
            }
            tbody.append("tr").html(`
                <td>${f.label}</td>
                <td>${value}</td>
            `);
        }
    });
}

// Hide tooltip
function hideTooltip() {
    d3.select(".tooltip").remove();
}