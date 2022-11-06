import React, { useRef, useEffect } from 'react';
import './App.css';
import * as d3 from 'd3';

const Graph = ({ width, height }) => {
    const scaleRef = useRef(null);
    scaleRef.current = 1;

    const d3Container = useRef(null);
    const NODE_NUM = 50;
    const graph = {
        nodes: Array.from({ length: NODE_NUM }, (n, index) => ({
            text: index,
            x: 0,
            y: 0,
        })),
        links: Array.from({ length: NODE_NUM }, (n, index) => ({
            source: Math.floor(Math.random() * NODE_NUM),
            target: Math.floor(Math.random() * NODE_NUM),
        })),
    };

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

    useEffect(() => {
        if (d3Container.current) {
            // SVG container
            const svg = d3.select(d3Container.current);

            // link container
            const link = svg
                .selectAll('.link')
                .data(graph.links)
                .join('line')
                .classed('link', true);

            // Node container: text and circle
            const node = svg
                .selectAll('.node')
                .data(graph.nodes)
                .enter()
                .append('g')
                .attr('class', 'node');
            node.append('circle').attr('r', 30);
            node.append('text')
                .text((d) => d.text)
                .attr('text-anchor', 'middle');

            const simulation = d3
                .forceSimulation(graph.nodes)
                .alphaDecay(0)
                .force('charge', d3.forceManyBody())
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('x', d3.forceX().strength(0.01))
                .force('y', d3.forceY().strength(0.01))
                .force('link', d3.forceLink(graph.links).distance(150))
                .force('collision', d3.forceCollide().radius(30))
                .on('tick', () => {
                    link.attr('x1', (d) => d.source.x)
                        .attr('y1', (d) => d.source.y)
                        .attr('x2', (d) => d.target.x)
                        .attr('y2', (d) => d.target.y);
                    node.select('circle')
                        .attr('cx', (d) => d.x)
                        .attr('cy', (d) => d.y);
                });

            const dragstart = function (event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = event.x;
                d.fy = event.y;
                const selectedNode = d3.select(this).datum();
                // console.log(adjList[selectedNode.text]);
                svg.selectAll('circle').each(function (d) {
                    let isNeighbour = adjList[selectedNode.text].has(d.text);
                    d3.select(this).style(
                        'fill',
                        isNeighbour ? 'yellow' : 'rgb(120, 120, 120)'
                    );
                });
                svg.selectAll('line')
                    .filter((d) => {
                        console.log(d.source);
                        if (
                            d.source.text === selectedNode.text &&
                            adjList[selectedNode.text].has(d.target.text)
                        ) {
                            console.log('hi');
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
                svg.selectAll('circle, .link').attr('transform', e.transform);
                svg.select('.scaleText').text(
                    `Scale Factor: ${scaleRef.current}`
                );
            };
            let zoom = d3.zoom().on('zoom', handleZoom);
            svg.append('text')
                .classed('scaleText', true)
                .attr('x', 50)
                .attr('y', 50);
            svg.call(zoom);
        }
    }, []);

    return (
        <>
            <svg
                className="graph-component"
                width={width}
                height={height}
                ref={d3Container}
                style={{ backgroundColor: 'gray' }}
            />
        </>
    );
};

export default Graph;
