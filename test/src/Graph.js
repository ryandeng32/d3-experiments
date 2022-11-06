import React, { useRef, useEffect } from 'react';
import './App.css';
import * as d3 from 'd3';

const Graph = ({ width, height }) => {
    const scaleRef = useRef(null);
    const d3Container = useRef(null);

    // number of fake nodes & links
    const TEST_NUM = 10;
    function randn_bm() {
        let u = 0,
            v = 0;
        while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        num = num / 10.0 + 0.5; // Translate to 0 -> 1
        if (num > 1 || num < 0) return randn_bm(); // resample between 0 and 1
        return num;
    }
    // fake graph
    const graph = {
        nodes: Array.from({ length: TEST_NUM }, (n, index) => ({
            text: index,
            x: 0,
            y: 0,
        })),
        links: Array.from({ length: TEST_NUM }, (n, index) => ({
            source: Math.floor((randn_bm() * TEST_NUM) / 10),
            // source: Math.floor(Math.random() * TEST_NUM),
            target: Math.floor(randn_bm() * TEST_NUM),
        })),
    };

    // create adjacency list for highlighting neighbours when dragged
    const adjList = {};
    for (let node of graph.nodes) {
        if (!(node in adjList)) {
            adjList[node.text] = new Set();
            adjList[node.text].add(node.text);
        }
    }
    for (let link of graph.links) {
        adjList[link.source].add(link.target);
        adjList[link.target].add(link.source);
    }

    let maxConnection = 1;
    for (let key in adjList) {
        maxConnection = Math.max(adjList[key].size, maxConnection);
    }
    let areaSqrtScale = d3
        .scaleSqrt()
        .domain([1, maxConnection])
        .range([30, 100]);

    useEffect(() => {
        if (!d3Container.current) {
            return;
        }
        // SVG container
        const svg = d3.select(d3Container.current);

        // links
        const link = svg
            .selectAll('line')
            .data(graph.links)
            .enter()
            .append('line')
            .classed('link', true);

        // Node container: text and circle
        const node = svg
            .selectAll('g')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', 'node');
        node.append('circle').attr('r', (d) => {
            return areaSqrtScale(adjList[d.text].size);
        });
        node.append('text')
            .text((d) => d.text)
            .attr('text-anchor', 'middle');

        const simulation = d3
            .forceSimulation(graph.nodes)
            .alphaDecay(0.01)
            .force(
                'charge',
                d3.forceManyBody().strength(function (d) {
                    if (adjList[d.text])
                        return Math.min(30, adjList[d.text].size) * -1000;
                })
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX().strength(0.2))
            .force('y', d3.forceY().strength(0.2))
            .force(
                'link',
                d3
                    .forceLink(graph.links)
                    .distance((d) => {
                        let maxConnectionNum = Math.max(
                            adjList[d.source.text].size,
                            adjList[d.target.text].size
                        );
                        return maxConnectionNum;
                    })
                    .strength(0.09)
            )
            .force('collision', d3.forceCollide().radius(30))
            .on('tick', () => {
                node.select('circle')
                    .attr('cx', (d) => d.x)
                    .attr('cy', (d) => d.y);
                node.select('text')
                    .attr('x', (d) => d.x)
                    .attr('y', (d) => d.y);
                link
                    // @ts-ignore
                    .attr('x1', (d) => d.source.x)
                    // @ts-ignore
                    .attr('y1', (d) => d.source.y)
                    // @ts-ignore
                    .attr('x2', (d) => d.target.x)
                    // @ts-ignore
                    .attr('y2', (d) => d.target.y);
            });

        const dragstart = function (event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = event.x;
            d.fy = event.y;
            const selectedNode = d3.select(this).datum();
            svg.selectAll('circle').each(function (d) {
                let isNeighbour = adjList[selectedNode.text].has(d.text);
                d3.select(this).style(
                    'fill',
                    isNeighbour ? 'yellow' : 'rgb(120, 120, 120)'
                );
            });
            svg.selectAll('line')
                .filter((d) => {
                    if (
                        d.source.text === selectedNode.text &&
                        adjList[selectedNode.text].has(d.target.text)
                    ) {
                        return true;
                    }
                    if (
                        d.target.text === selectedNode.text &&
                        adjList[selectedNode.text].has(d.source.text)
                    ) {
                        return true;
                    }
                    return false;
                })
                .style('stroke', 'yellow');
        };

        const dragged = function (event, d) {
            d.fx += event.dx / scaleRef.current;
            d.fy += event.dy / scaleRef.current;
        };

        const dragended = (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            svg.selectAll('circle').style('fill', null);
            svg.selectAll('line').style('stroke', 'rgb(101, 101, 101)');
        };

        const drag = d3
            .drag()
            .on('start', dragstart)
            .on('drag', dragged)
            .on('end', dragended);

        node.call(drag);

        const handleZoom = (e) => {
            scaleRef.current = e.transform.k;
            svg.selectAll('.link, circle, .node > text').attr(
                'transform',
                e.transform
            );
            svg.select('.scaleText').text(`Scale Factor: ${scaleRef.current}`);
        };
        let zoom = d3.zoom().on('zoom', handleZoom);
        svg.append('text')
            .classed('scaleText', true)
            .attr('x', 50)
            .attr('y', 50);
        svg.call(zoom);
    }, []);

    return (
        <>
            <svg
                className="graph"
                width={width}
                height={height}
                ref={d3Container}
            />
        </>
    );
};

export default Graph;
