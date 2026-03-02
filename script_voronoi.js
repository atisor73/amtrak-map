// script_voronoi.js
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7";
// import { voronoiTreemap } from "https://cdn.jsdelivr.net/npm/d3-voronoi-treemap@1.1.2/build/d3-voronoi-treemap.js";
// Load CSV

d3.csv("data/DF_BTS_AMTRAK_RIDERSHIP_2025.csv").then(rawData => {
// d3.csv("data/DF_TREEMAP_IL_POP.csv").then(rawData => {
    rawData.forEach(d => d.value = +d.value);  

    const width = 620;
    const height = 620;
    const margin = 20; // more space for labels


    const TOP_N_GROUPS = 18;  // for drawing labels
    const TOP_N_SUBGROUPS = 30;  // for drawing labels

    const formatComma = d3.format(",");

    // Create nested data
    const nestedData = d3.groups(rawData, d => d.group).map(([key, values]) => ({
        name: key,
        children: values.map(d => ({
            name: d.subgroup,
            value: d.value
        }))
    }));
    console.log(nestedData);
    const rootNode = d3.hierarchy({ children: nestedData }).sum(d => d.value);
    console.log(rootNode);

    
    
    // Create clipPolygon & pass into Treemap, and call rootNode
    const center = [width/2, height/2];
    const radius = width/2 - margin;
    const nPoints = 100;
    const clipPolygon = Array.from({ length: nPoints }, (_, i) => {
        const angle = (i / nPoints) * 2 * Math.PI;
        return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    });
    const treemap = d3.voronoiTreemap().clip(clipPolygon);
    treemap(rootNode);

    // Drawing
    const nodes = rootNode.descendants();

    console.log(
        nodes.map(d => ({
            name: d.data.name,
            parent: d.data,
            depth: d.depth,
            hasPolygon: !!d.polygon
        }))
    );
    const svg = d3.select("#voronoi")
        .attr("width", width)
        .attr("height", height);

    const line = d3.line()
        .x(d => d[0])
        .y(d => d[1]);

    const palette_category_20 = [
        '#1f77b4',
        '#aec7e8',
        '#ff7f0e',
        '#ffbb78',
        '#2ca02c',
        '#98df8a',
        '#d62728',
        '#ff9896',
        '#9467bd',
        '#c5b0d5',
        '#8c564b',
        '#c49c94',
        '#e377c2',
        '#f7b6d2',
        '#7f7f7f',
        '#c7c7c7',
        '#bcbd22',
        '#dbdb8d',
        '#17becf',
        '#9edae5'];
    const palette_category_20b = [
        '#393b79',
        '#5254a3',
        '#6b6ecf',
        '#9c9ede',
        '#637939',
        '#8ca252',
        '#b5cf6b',
        '#cedb9c',
        '#8c6d31',
        '#bd9e39',
        '#e7ba52',
        '#e7cb94',
        '#843c39',
        '#ad494a',
        '#d6616b',
        '#e7969c',
        '#7b4173',
        '#a55194',
        '#ce6dbd',
        '#de9ed6'];
    const palette_muted = [
                "#CC6677",
                "#332288",
                "#DDCC77",
                "#117733",
                "#88CCEE",
                "#882255",
                "#44AA99",
                "#999933",
                "#AA4499",

            ];
    const palette_selected = palette_category_20b;

    const groups = nestedData.map(d => d.name);
    const palette = d3.scaleOrdinal()
            .domain(groups) 
            .range(palette_selected);
        


    // Draw polygons
    svg.selectAll("path")
        .data(nodes.filter(d => d.polygon))
        .enter()
        .append("path")
        .attr("d", d => line(d.polygon) + "Z")
        .attr("fill", d => {
             if (d.depth === 1) {
                return palette(d.parent.data.name);   // outer group
                }
            if (d.depth === 2) {
                return d3.color(palette(d.parent.data.name)).brighter(0.4);
            }
        })
        .attr("stroke", "#505050")
        .attr("opacity", 0.7)

        // ✅ hover start
        .on("mouseover", (event, d) => {
            if (d.depth !== 2) return;
            tooltip
                .style("opacity", 1)
                .html(
                    "<b>" + d.data.name + "</b><br>" +
                    "State: " + d.parent.data.name + "<br>" +
                    "Ridership: " + formatComma(d.value)
                );
        })

        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })

        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    console.log(nodes);



    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "4px 6px")
        .style("font-family", "Courier New, monospace")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);


    svg.on("mouseleave", () => {
     tooltip.style("opacity", 0);
    });

    // Compute top groups for creating labels later
    // total value per group
    const groupTotals = nestedData.map(d => ({
        name: d.name,
        total: d3.sum(d.children, c => c.value)
    }));

    // sort descending
    groupTotals.sort((a, b) => d3.descending(a.total, b.total));

    // take top N
    const topGroups = new Set(
        groupTotals.slice(0, TOP_N_GROUPS).map(d => d.name)
    );

    console.log("Top groups:", topGroups);


    // Compute top subgroups for creating labels later
    const allSubgroups = [];
    nestedData.forEach(g => {
        g.children.forEach(c => allSubgroups.push({
            name: c.name,
            parent: g.name,
            value: c.value
        }));
    });
    // Sort subgroups descending by value and take top 30
    allSubgroups.sort((a, b) => d3.descending(a.value, b.value));
    const topSubgroups = new Set(allSubgroups.slice(0, 30).map(d => d.name));
    console.log("Top subgroups: ", topSubgroups);


    // // Write group and subgroup
    // Append text elements without text yet
    const textSelection = svg.selectAll("text.label")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => d.polygon ? d3.polygonCentroid(d.polygon)[0] : 0)
        .attr("y", d => d.polygon ? d3.polygonCentroid(d.polygon)[1] : 0)
        .attr("font-size", d => d.depth === 1 ? "12pt" : d.depth === 2 ? "9pt" : "0pt")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#050505")
        .attr("font-weight", "bold")
        .attr("stroke", "#eaeaea")
        .attr("stroke-width", 0.15)
        .attr("font-family", "Courier New, monospace");

    // Now update the text **after polygons exist**
    textSelection.text(d => {
        if (!d.polygon) return "";
        if (d.depth === 1) return topGroups.has(d.data.name) ? d.data.name : "";
        if (d.depth === 2) return ""; // subgroups hidden initially
        return "";
    });

    let showSubgroup = false;
    // Toggle button
    document.getElementById("toggle-text").addEventListener("click", () => {
        d3.selectAll("text.label")
            .text(d => {
                if (!d.polygon) return "";
                if (d.depth === 1) { return (!showSubgroup && topGroups.has(d.data.name)) ? d.data.name : ""; }
                if (d.depth === 2) { return (showSubgroup && topSubgroups.has(d.data.name)) ? d.data.name : ""; }
                return "";
            })
        document.getElementById("toggle-text").innerText = showSubgroup ? "Show State Labels" : "Show Station Labels";
        showSubgroup = !showSubgroup;
    });
  

    // Write value
    // svg.selectAll("text.value")
    //     .data(nodes)
    //     .enter()
    //     .append("text")
    //     .attr("class", "value")
    //     .attr("x", d => d3.polygonCentroid(d.polygon)[0])
    //     .attr("y", d => d3.polygonCentroid(d.polygon)[1] + 16) //
    //     .text(d => d.data.value)
    //     .attr("font-size", "8pt")
    //     .attr("text-anchor", "middle")
    //     .attr("dominant-baseline", "middle")
    //     .attr("fill", "#232323")
    //     .attr("font-family", "Courier New, monospace");


     // INFO BOX ON RIGHT
    const totalValue = d3.sum(nodes.filter(d => d.depth === 2), d => d.value); // total over all subgroups
    const groupTotalsMap = new Map(
        nestedData.map(d => [d.name, d3.sum(d.children, c => c.value)])
    );

    const totalRidership = d3.sum(rawData, d => d.value); // total of value column
    const groupRidershipMap = d3.rollup(
        rawData,
        v => d3.sum(v, d => d.value),
        d => d.group
    );
    const groupSubgroupCount = d3.rollup(
        rawData,
        v => new Set(v.map(d => d.subgroup)).size,
        d => d.group
    );
    const subgroupRidershipMap = d3.rollup(
        rawData,
        v => d3.sum(v, d => d.value),
        d => `${d.group}|${d.subgroup}`   // unique key
    );

    // Hover handler
    // inside your d3 hover handler
    svg.selectAll("path")
        .on("mouseover", (event, d) => {
            if (d.depth !== 2) return;

            // --- small tooltip following mouse ---
            if (d.depth === 2) {
                tooltip
                    .style("opacity", 1)
                    .html(
                        "<b>" + d.data.name + "</b><br>" +
                        "State: " + d.parent.data.name + "<br>" +
                        "Ridership: " + d.value.toLocaleString()
                    );
            }

            const groupName = d.parent.data.name;
            const subgroupName = d.data.name;

            const groupTotal = groupRidershipMap.get(groupName);
            const subgroupTotal = subgroupRidershipMap.get(`${groupName}|${subgroupName}`);
            const subgroupCountInGroup = groupSubgroupCount.get(groupName);

            const subgroupPctOfGroup = ((subgroupTotal / groupTotal) * 100).toFixed(1);
            const groupPctOfTotal = ((groupTotal / totalRidership) * 100).toFixed(1);
            const subgroupPctOfTotal = ((subgroupTotal / totalRidership) * 100).toFixed(1);

            // Update fixed info box with two-column structure
            const infoBox = document.getElementById("fixed-info");
            infoBox.innerHTML = `
                <div class="label">Total ridership:</div><div class="value">${totalRidership.toLocaleString()}</div>
                <div class="label">${groupName} ridership:</div><div class="value">${groupTotal.toLocaleString()}  (${groupPctOfTotal}%)</div>
                <div class="label">${subgroupName} station ridership:</div>
                    <div class="value">${subgroupTotal.toLocaleString()} <br> 
                    ${subgroupPctOfTotal}% of total <br>
                     ${subgroupPctOfGroup}% of state</div>
                <div class="label"># stations in state:</div><div class="value">${subgroupCountInGroup}</div>
            `;
        })
        .on("mouseout", () => {
            document.getElementById("fixed-info").innerHTML = "";
        });
    // svg.selectAll("path")
    //     .on("mouseover", (event, d) => {
    //         if (d.depth !== 2) return; // only for subgroups

    //         const groupName = d.parent.data.name;
    //         const subgroupName = d.data.name;

    //         const groupTotal = groupRidershipMap.get(groupName);
    //         const subgroupTotal = subgroupRidershipMap.get(`${groupName}|${subgroupName}`);
    //         const subgroupCountInGroup = groupSubgroupCount.get(groupName);

    //         const subgroupPctOfGroup = ((subgroupTotal / groupTotal) * 100).toFixed(1);
    //         const groupPctOfTotal = ((groupTotal / totalRidership) * 100).toFixed(1);
    //         const subgroupPctOfTotal = ((subgroupTotal / totalRidership) * 100).toFixed(1);

    //         // Update fixed info box
    //         document.getElementById("fixed-info").textContent =
    //             `Total ridership: ${totalRidership.toLocaleString()}\n` +
    //             `${groupName} state ridership: ${groupTotal.toLocaleString()} (${groupPctOfTotal}%)\n` +
    //             `${subgroupName} station ridership: ${subgroupTotal.toLocaleString()} (${subgroupPctOfTotal}% of total, ${subgroupPctOfGroup}% of state)\n` +
    //             `# of unique stations in state: ${subgroupCountInGroup}`;
    //     })
    //     .on("mousemove", (event) => {
    //         tooltip
    //             .style("left", (event.pageX + 10) + "px")
    //             .style("top", (event.pageY + 10) + "px");
    //     })
    //     .on("mouseout", () => {
    //         tooltip.style("opacity", 0);
    //         document.getElementById("fixed-info").textContent = ""; // clear when not hovering
    //     });














    // BUTTONS
    document.getElementById("download-svg").addEventListener("click", function () {
        const svg = document.getElementById("voronoi");
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);

        const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "voronoi.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById("download-png").addEventListener("click", function () {
        const svg = document.getElementById("voronoi");
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);

        const img = new Image();
        const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = svg.clientWidth;
            canvas.height = svg.clientHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            const pngLink = document.createElement("a");
            pngLink.download = "voronoi.png";
            pngLink.href = canvas.toDataURL("image/png");
            pngLink.click();
        };

        img.src = url;
        });

});

