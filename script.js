document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const canvas = document.getElementById("graph-canvas")
  const ctx = canvas.getContext("2d")

  const editModeBtn = document.getElementById("edit-mode")
  const selectModeBtn = document.getElementById("select-mode")
  const editControls = document.getElementById("edit-controls")
  const selectControls = document.getElementById("select-controls")
  const edgeControls = document.getElementById("edge-controls")
  const graphControls = document.getElementById("graph-controls")
  const weightInput = document.getElementById("weight")
  const cancelEdgeBtn = document.getElementById("cancel-edge")
  const sampleGraphBtn = document.getElementById("sample-graph")
  const clearGraphBtn = document.getElementById("clear-graph")
  const showWeightsSwitch = document.getElementById("weights")
  const speedSlider = document.getElementById("speed")
  const startNodeLabel = document.getElementById("start-node-label")
  const endNodeLabel = document.getElementById("end-node-label")
  const resetAlgorithmBtn = document.getElementById("reset-algorithm")
  const runAlgorithmBtn = document.getElementById("run-algorithm")
  const tabTriggers = document.querySelectorAll(".tab-trigger")
  const tabContents = document.querySelectorAll(".tab-content")

  // Map Elements
  const mapContainer = document.getElementById("map-container")
  const mapClearBtn = document.getElementById("map-clear")
  const mapLocateBtn = document.getElementById("map-locate")
  const mapModeSelect = document.getElementById("map-mode")
  const mapStartLocation = document.getElementById("map-start-location")
  const mapEndLocation = document.getElementById("map-end-location")
  const mapResetBtn = document.getElementById("map-reset")
  const mapCalculateBtn = document.getElementById("map-calculate")
  const mapDistance = document.getElementById("map-distance")
  const mapTime = document.getElementById("map-time")

  // Graph state
  let nodes = []
  let edges = []
  let nextNodeId = 1

  // Algorithm state
  let startNode = null
  let endNode = null
  let isRunning = false
  let speed = 50
  let showWeights = true
  let path = []
  let visitedNodes = []
  let distances = {}

  // Canvas state
  let isDragging = false
  let draggedNode = null
  let isAddingEdge = false
  let edgeStart = null

  // Mode state
  let mode = "edit" // 'edit' or 'select'

  // Map state
  let map = null
  let mapStartMarker = null
  let mapEndMarker = null
  let mapPath = null
  let mapTransportMode = "driving"

  // Initialize canvas size
  function updateCanvasSize() {
    const container = canvas.parentElement
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    drawGraph()
  }

  // Set up event listeners
  function setupEventListeners() {
    // Mode switching
    editModeBtn.addEventListener("click", () => setMode("edit"))
    selectModeBtn.addEventListener("click", () => setMode("select"))

    // Canvas interactions
    canvas.addEventListener("click", handleCanvasClick)
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", handleMouseUp)

    // Edge controls
    cancelEdgeBtn.addEventListener("click", cancelAddingEdge)

    // Graph controls
    sampleGraphBtn.addEventListener("click", createSampleGraph)
    clearGraphBtn.addEventListener("click", clearGraph)

    // Algorithm controls
    resetAlgorithmBtn.addEventListener("click", resetAlgorithm)
    runAlgorithmBtn.addEventListener("click", runDijkstra)

    // UI controls
    showWeightsSwitch.addEventListener("change", () => {
      showWeights = showWeightsSwitch.checked
      drawGraph()
    })

    speedSlider.addEventListener("input", () => {
      speed = Number.parseInt(speedSlider.value)
    })

    // Tab switching
    tabTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const tabId = trigger.getAttribute("data-tab")

        // Update active tab trigger
        tabTriggers.forEach((t) => t.classList.remove("active"))
        trigger.classList.add("active")

        // Update active tab content
        tabContents.forEach((content) => content.classList.remove("active"))
        document.getElementById(`${tabId}-tab`).classList.add("active")

        // Initialize map when switching to map tab
        if (tabId === "map" && !map) {
          initMap()
        }
      })
    })

    // Map controls
    mapClearBtn.addEventListener("click", clearMapMarkers)
    mapLocateBtn.addEventListener("click", goToUserLocation)
    mapModeSelect.addEventListener("change", () => {
      mapTransportMode = mapModeSelect.value
    })
    mapResetBtn.addEventListener("click", resetMapRoute)
    mapCalculateBtn.addEventListener("click", calculateMapRoute)

    // Window resize
    window.addEventListener("resize", updateCanvasSize)
  }

  // Set mode (edit or select)
  function setMode(newMode) {
    mode = newMode

    if (mode === "edit") {
      editModeBtn.classList.add("primary")
      selectModeBtn.classList.remove("primary")
      editControls.style.display = "flex"
      selectControls.style.display = "none"
    } else {
      editModeBtn.classList.remove("primary")
      selectModeBtn.classList.add("primary")
      editControls.style.display = "none"
      selectControls.style.display = "flex"
    }
  }

  // Draw the graph
  function drawGraph() {
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw edges
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from)
      const toNode = nodes.find((n) => n.id === edge.to)

      if (fromNode && toNode) {
        // Determine if this edge is part of the path
        const isInPath =
          path.length > 1 &&
          path.indexOf(edge.from) !== -1 &&
          path.indexOf(edge.to) !== -1 &&
          Math.abs(path.indexOf(edge.from) - path.indexOf(edge.to)) === 1

        // Draw edge
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)

        if (isInPath) {
          ctx.strokeStyle = "#10b981" // Green for path
          ctx.lineWidth = 3
        } else {
          ctx.strokeStyle = "#64748b" // Default edge color
          ctx.lineWidth = 2
        }

        ctx.stroke()

        // Draw weight if enabled
        if (showWeights) {
          const midX = (fromNode.x + toNode.x) / 2
          const midY = (fromNode.y + toNode.y) / 2

          ctx.fillStyle = "#f8fafc"
          ctx.beginPath()
          ctx.arc(midX, midY, 12, 0, 2 * Math.PI)
          ctx.fill()

          ctx.fillStyle = "#0f172a"
          ctx.font = "12px sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(edge.weight.toString(), midX, midY)
        }
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath()

      // Determine node color based on state
      let fillColor = "#64748b" // Default

      if (node.id === startNode) {
        fillColor = "#3b82f6" // Blue for start
      } else if (node.id === endNode) {
        fillColor = "#ef4444" // Red for end
      } else if (visitedNodes.includes(node.id)) {
        fillColor = "#a855f7" // Purple for visited
      }

      if (path.includes(node.id)) {
        fillColor = "#10b981" // Green for path
      }

      // Draw node
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI)
      ctx.fillStyle = fillColor
      ctx.fill()

      // Draw node label
      ctx.fillStyle = "#ffffff"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(node.label, node.x, node.y)

      // Draw distance if available
      if (distances[node.id] !== undefined && distances[node.id] !== Number.POSITIVE_INFINITY) {
        ctx.fillStyle = "#f8fafc"
        ctx.beginPath()
        ctx.arc(node.x + 25, node.y - 25, 15, 0, 2 * Math.PI)
        ctx.fill()

        ctx.fillStyle = "#0f172a"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(distances[node.id].toString(), node.x + 25, node.y - 25)
      }
    })

    // Update UI
    updateUI()
  }

  // Update UI elements
  function updateUI() {
    // Update start/end node labels
    startNodeLabel.textContent =
      startNode !== null ? `Start: ${nodes.find((n) => n.id === startNode)?.label || ""}` : "Start: Not selected"

    endNodeLabel.textContent =
      endNode !== null ? `End: ${nodes.find((n) => n.id === endNode)?.label || ""}` : "End: Not selected"

    // Update run button state
    runAlgorithmBtn.disabled = startNode === null || endNode === null || isRunning
    runAlgorithmBtn.textContent = isRunning ? "Running..." : "Run Algorithm"

    // Update reset button state
    resetAlgorithmBtn.disabled = isRunning

    // Update edge controls visibility
    if (isAddingEdge) {
      edgeControls.style.display = "flex"
      graphControls.style.display = "none"
    } else {
      edgeControls.style.display = "none"
      graphControls.style.display = "flex"
    }
  }

  // Handle canvas click
  function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked on a node
    const clickedNode = nodes.find((node) => Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)) < 20)

    if (mode === "edit") {
      if (clickedNode) {
        // If adding an edge
        if (isAddingEdge) {
          if (edgeStart !== null && edgeStart !== clickedNode.id) {
            // Check if edge already exists
            const edgeExists = edges.some(
              (edge) =>
                (edge.from === edgeStart && edge.to === clickedNode.id) ||
                (edge.from === clickedNode.id && edge.to === edgeStart),
            )

            if (!edgeExists) {
              const weight = Number.parseInt(weightInput.value) || 1
              edges.push({
                from: edgeStart,
                to: clickedNode.id,
                weight,
              })
            }

            cancelAddingEdge()
          }
        } else {
          // Start adding edge
          isAddingEdge = true
          edgeStart = clickedNode.id
          updateUI()
        }
      } else if (!isAddingEdge) {
        // Add new node if not clicked on existing node and not adding edge
        const newNode = {
          id: nextNodeId,
          x,
          y,
          label: nextNodeId.toString(),
        }

        nodes.push(newNode)
        nextNodeId++
      }
    } else if (mode === "select") {
      if (clickedNode) {
        if (startNode === clickedNode.id) {
          startNode = null
        } else if (endNode === clickedNode.id) {
          endNode = null
        } else if (startNode === null) {
          startNode = clickedNode.id
        } else if (endNode === null) {
          endNode = clickedNode.id
        }
      }
    }

    drawGraph()
  }

  // Handle mouse down for dragging
  function handleMouseDown(e) {
    if (mode !== "edit") return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked on a node
    const clickedNodeIndex = nodes.findIndex(
      (node) => Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)) < 20,
    )

    if (clickedNodeIndex !== -1) {
      isDragging = true
      draggedNode = nodes[clickedNodeIndex].id
    }
  }

  // Handle mouse move for dragging
  function handleMouseMove(e) {
    if (!isDragging || draggedNode === null) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Update node position
    nodes = nodes.map((node) => (node.id === draggedNode ? { ...node, x, y } : node))

    drawGraph()
  }

  // Handle mouse up to end dragging
  function handleMouseUp() {
    isDragging = false
    draggedNode = null
  }

  // Cancel adding edge
  function cancelAddingEdge() {
    isAddingEdge = false
    edgeStart = null
    updateUI()
  }

  // Run Dijkstra's algorithm
  async function runDijkstra() {
    if (startNode === null || endNode === null || isRunning) return

    isRunning = true
    path = []
    visitedNodes = []
    distances = {}
    drawGraph()

    // Create adjacency list
    const graph = {}

    nodes.forEach((node) => {
      graph[node.id] = []
    })

    edges.forEach((edge) => {
      graph[edge.from].push({ node: edge.to, weight: edge.weight })
      graph[edge.to].push({ node: edge.from, weight: edge.weight }) // For undirected graph
    })

    // Initialize distances
    const dist = {}
    const prev = {}
    const unvisited = new Set()

    nodes.forEach((node) => {
      dist[node.id] = node.id === startNode ? 0 : Number.POSITIVE_INFINITY
      prev[node.id] = null
      unvisited.add(node.id)
    })

    distances = { ...dist }
    drawGraph()

    // Main algorithm loop
    while (unvisited.size > 0) {
      // Find node with minimum distance
      let minDist = Number.POSITIVE_INFINITY
      let minNode = null

      unvisited.forEach((nodeId) => {
        if (dist[nodeId] < minDist) {
          minDist = dist[nodeId]
          minNode = nodeId
        }
      })

      if (minNode === null || minDist === Number.POSITIVE_INFINITY) break

      // If we reached the end node
      if (minNode === endNode) break

      unvisited.delete(minNode)

      // Mark as visited for visualization
      visitedNodes.push(minNode)
      distances = { ...dist }
      drawGraph()

      // Update distances to neighbors
      for (const { node: neighbor, weight } of graph[minNode]) {
        if (unvisited.has(neighbor)) {
          const alt = dist[minNode] + weight
          if (alt < dist[neighbor]) {
            dist[neighbor] = alt
            prev[neighbor] = minNode
          }
        }
      }

      // Delay for visualization
      await new Promise((resolve) => setTimeout(resolve, 1000 - speed * 9))
    }

    // Reconstruct path
    const shortestPath = []
    let current = endNode

    while (current !== null) {
      shortestPath.unshift(current)
      current = prev[current]
    }

    path = shortestPath
    isRunning = false
    drawGraph()
  }

  // Reset the algorithm
  function resetAlgorithm() {
    path = []
    visitedNodes = []
    distances = {}
    isRunning = false
    drawGraph()
  }

  // Clear the graph
  function clearGraph() {
    nodes = []
    edges = []
    nextNodeId = 1
    resetAlgorithm()
    startNode = null
    endNode = null
    drawGraph()
  }

  // Create a sample graph
  function createSampleGraph() {
    clearGraph()

    const sampleNodes = [
      { id: 1, x: 100, y: 100, label: "1" },
      { id: 2, x: 250, y: 150, label: "2" },
      { id: 3, x: 400, y: 100, label: "3" },
      { id: 4, x: 100, y: 250, label: "4" },
      { id: 5, x: 250, y: 300, label: "5" },
      { id: 6, x: 400, y: 250, label: "6" },
    ]

    const sampleEdges = [
      { from: 1, to: 2, weight: 7 },
      { from: 1, to: 4, weight: 5 },
      { from: 2, to: 3, weight: 8 },
      { from: 2, to: 4, weight: 9 },
      { from: 2, to: 5, weight: 7 },
      { from: 3, to: 6, weight: 5 },
      { from: 4, to: 5, weight: 15 },
      { from: 5, to: 6, weight: 6 },
    ]

    nodes = sampleNodes
    edges = sampleEdges
    nextNodeId = 7
    startNode = 1
    endNode = 6

    drawGraph()
  }

  // Initialize map
  function initMap() {
    // Create the map centered on a default location
    map = L.map(mapContainer).setView([40.7128, -74.0060], 13)

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Handle map click events
    map.on('click', handleMapClick)

    // Wait a moment for the map to initialize properly
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }

  // Handle map click events
  function handleMapClick(e) {
    const { lat, lng } = e.latlng

    // First click sets start point
    if (!mapStartMarker) {
      mapStartMarker = createMarker([lat, lng], 'start')
      mapStartLocation.textContent = `Start: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } 
    // Second click sets end point
    else if (!mapEndMarker) {
      mapEndMarker = createMarker([lat, lng], 'end')
      mapEndLocation.textContent = `End: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
      
      // Enable calculate button if both markers are set
      mapCalculateBtn.disabled = false
    }
  }

  // Create a marker on the map
  function createMarker(latLng, type) {
    const markerColor = type === 'start' ? '#3b82f6' : '#ef4444'
    
    const marker = L.marker(latLng, {
      draggable: true,
      icon: L.divIcon({
        className: `custom-marker ${type}-marker`,
        html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map)

    // Create popup content
    const popupContent = document.createElement('div')
    popupContent.className = 'marker-popup'
    popupContent.innerHTML = `
      <strong>${type === 'start' ? 'Start Point' : 'End Point'}</strong>
      <div>${latLng[0].toFixed(5)}, ${latLng[1].toFixed(5)}</div>
      <button class="remove-marker">Remove</button>
    `
    
    // Add event listener to the remove button
    const removeButton = popupContent.querySelector('.remove-marker')
    removeButton.addEventListener('click', () => {
      map.removeLayer(marker)
      if (type === 'start') {
        mapStartMarker = null
        mapStartLocation.textContent = 'Start: Not selected'
      } else {
        mapEndMarker = null
        mapEndLocation.textContent = 'End: Not selected'
      }
      
      // Remove route if it exists
      if (mapPath) {
        map.removeLayer(mapPath)
        mapPath = null
      }
    })

    // Bind popup to marker
    marker.bindPopup(L.popup({
      closeButton: false
    }).setContent(popupContent))

    // Update coordinates on drag
    marker.on('dragend', function() {
      const newLatLng = marker.getLatLng()
      if (type === 'start') {
        mapStartLocation.textContent = `Start: ${newLatLng.lat.toFixed(5)}, ${newLatLng.lng.toFixed(5)}`
      } else {
        mapEndLocation.textContent = `End: ${newLatLng.lat.toFixed(5)}, ${newLatLng.lng.toFixed(5)}`
      }
      
      // Remove existing route
      if (mapPath) {
        map.removeLayer(mapPath)
        mapPath = null
      }
      
      // Update popup content
      const newPopupContent = document.createElement('div')
      newPopupContent.className = 'marker-popup'
      newPopupContent.innerHTML = `
        <strong>${type === 'start' ? 'Start Point' : 'End Point'}</strong>
        <div>${newLatLng.lat.toFixed(5)}, ${newLatLng.lng.toFixed(5)}</div>
        <button class="remove-marker">Remove</button>
      `
      
      const removeButton = newPopupContent.querySelector('.remove-marker')
      removeButton.addEventListener('click', () => {
        map.removeLayer(marker)
        if (type === 'start') {
          mapStartMarker = null
          mapStartLocation.textContent = 'Start: Not selected'
        } else {
          mapEndMarker = null
          mapEndLocation.textContent = 'End: Not selected'
        }
        
        // Remove route if it exists
        if (mapPath) {
          map.removeLayer(mapPath)
          mapPath = null
        }
      })
      
      marker.getPopup().setContent(newPopupContent)
    })

    return marker
  }

  // Clear all markers on the map
  function clearMapMarkers() {
    if (mapStartMarker) {
      map.removeLayer(mapStartMarker)
      mapStartMarker = null
      mapStartLocation.textContent = 'Start: Not selected'
    }
    
    if (mapEndMarker) {
      map.removeLayer(mapEndMarker)
      mapEndMarker = null
      mapEndLocation.textContent = 'End: Not selected'
    }
    
    // Remove route if it exists
    if (mapPath) {
      // If it's a routing control
      if (mapPath.getPlan) {
        map.removeControl(mapPath);
      } 
      // If it's a standard layer
      else if (mapPath.remove) {
        map.removeLayer(mapPath);
      }
      mapPath = null;
    }
    
    mapDistance.textContent = '0 km';
    mapTime.textContent = '0 min';
    mapCalculateBtn.disabled = true;
  }

  // Go to user's current location
  function goToUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          map.setView([latitude, longitude], 15)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Could not get your location. Please enable location services and try again.')
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
    }
  }

  // Reset map route
  function resetMapRoute() {
    if (mapPath) {
      // If it's a routing control
      if (mapPath.getPlan) {
        map.removeControl(mapPath);
      } 
      // If it's a standard layer
      else if (mapPath.remove) {
        map.removeLayer(mapPath);
      }
      mapPath = null;
    }
    
    mapDistance.textContent = '0 km';
    mapTime.textContent = '0 min';
  }

  // Calculate map route
  async function calculateMapRoute() {
    if (!mapStartMarker || !mapEndMarker) {
      alert('Please select both start and end points')
      return
    }
    
    const startLatLng = mapStartMarker.getLatLng()
    const endLatLng = mapEndMarker.getLatLng()
    
    // Clear any previous path
    if (mapPath) {
      if (mapPath.getPlan) {
        map.removeControl(mapPath);
      } else if (mapPath.remove) {
        map.removeLayer(mapPath);
      }
      mapPath = null
    }
    
    // Reset stats
    mapDistance.textContent = '0 km'
    mapTime.textContent = '0 min'
    
    try {
      // Get the profile from the transport mode
      const profile = mapTransportMode || 'driving';
      
      // Try with direct polyline first as fallback
      const latlngs = [
        [startLatLng.lat, startLatLng.lng],
        [endLatLng.lat, endLatLng.lng]
      ];
      
      // Create the routing control
      mapPath = L.Routing.control({
        waypoints: [
          L.latLng(startLatLng.lat, startLatLng.lng),
          L.latLng(endLatLng.lat, endLatLng.lng)
        ],
        router: L.Routing.osrmv1({
          serviceUrl: `https://router.project-osrm.org/route/v1`,
          profile: profile
        }),
        lineOptions: {
          styles: [{color: '#10b981', weight: 6, opacity: 0.8}],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        show: false,
        collapsible: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false
      }).addTo(map);
      
      // Listen for the route found event to update distance and time
      mapPath.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        // Update display (distance in km, time in minutes)
        const distanceInKm = (summary.totalDistance / 1000).toFixed(2);
        const timeInMinutes = Math.round(summary.totalTime / 60);
        
        mapDistance.textContent = `${distanceInKm} km`;
        mapTime.textContent = `${timeInMinutes} min`;
      });
      
      // In case routing fails, at least show a direct line
      mapPath.on('routingerror', function(e) {
        console.error('Routing error:', e);
        
        // Create a simple polyline as fallback
        const fallbackPath = L.polyline(latlngs, {
          color: '#10b981',
          weight: 6,
          opacity: 0.8,
          dashArray: '10, 10',
          lineJoin: 'round'
        }).addTo(map);
        
        // Calculate straight line distance
        const distance = calculateDistance(
          startLatLng.lat, startLatLng.lng, 
          endLatLng.lat, endLatLng.lng
        );
        
        // Estimate time based on straight line
        let speedKmh;
        switch (mapTransportMode) {
          case 'walking':
            speedKmh = 5;
            break;
          case 'cycling':
            speedKmh = 15;
            break;
          default:
            speedKmh = 40;
        }
        
        const timeMinutes = Math.round((distance / speedKmh) * 60);
        
        // Update display
        mapDistance.textContent = `${distance.toFixed(2)} km (direct)`;
        mapTime.textContent = `${timeMinutes} min (estimated)`;
        
        // Replace the routing control with this polyline
        if (mapPath) {
          map.removeControl(mapPath);
        }
        mapPath = fallbackPath;
        
        // Fit bounds to show the path
        map.fitBounds(fallbackPath.getBounds(), { padding: [50, 50] });
      });
      
    } catch (error) {
      console.error('Error calculating route:', error)
      
      // Fallback to direct line if anything fails
      const latlngs = [
        [startLatLng.lat, startLatLng.lng],
        [endLatLng.lat, endLatLng.lng]
      ];
      
      const fallbackPath = L.polyline(latlngs, {
        color: '#10b981',
        weight: 6,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(map);
      
      // Calculate straight line distance
      const distance = calculateDistance(
        startLatLng.lat, startLatLng.lng, 
        endLatLng.lat, endLatLng.lng
      );
      
      // Estimate time based on straight line
      let speedKmh;
      switch (mapTransportMode) {
        case 'walking':
          speedKmh = 5;
          break;
        case 'cycling':
          speedKmh = 15;
          break;
        default:
          speedKmh = 40;
      }
      
      const timeMinutes = Math.round((distance / speedKmh) * 60);
      
      // Update display
      mapDistance.textContent = `${distance.toFixed(2)} km (direct)`;
      mapTime.textContent = `${timeMinutes} min (estimated)`;
      
      mapPath = fallbackPath;
      
      // Fit bounds to show the path
      map.fitBounds(fallbackPath.getBounds(), { padding: [50, 50] });
    }
  }
  
  // Calculate distance between two points in kilometers (haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in km
    return distance
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI/180)
  }
  
  // Animate a marker along the route
  function animateRouteMarker(coordinates) {
    // Create an animated marker to move along the route
    const animatedMarker = L.circleMarker(coordinates[0], {
      radius: 6,
      color: '#10b981', // Green for path
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 1
    }).addTo(map)
    
    // Also add small markers along the path for visualization
    const pathMarkers = []
    for (let i = 1; i < coordinates.length - 1; i++) {
      const marker = L.circleMarker(coordinates[i], {
        radius: 3,
        color: '#a855f7', // Purple for visited points
        fillColor: '#a855f7',
        fillOpacity: 1,
        weight: 1
      }).addTo(map)
      pathMarkers.push(marker)
    }
    
    let step = 0
    const maxSteps = 100
    const totalPoints = coordinates.length
    
    function animate() {
      if (step <= maxSteps) {
        const progress = step / maxSteps
        const pointIndex = Math.min(Math.floor(progress * (totalPoints - 1)), totalPoints - 1)
        const point = coordinates[pointIndex]
        
        animatedMarker.setLatLng(point)
        step++
        requestAnimationFrame(animate)
      } else {
        // Animation complete, remove the marker
        map.removeLayer(animatedMarker)
        
        // Remove path markers after a delay
        setTimeout(() => {
          pathMarkers.forEach(marker => map.removeLayer(marker))
        }, 1000)
      }
    }
    
    animate()
  }

  // Initialize the app
  function init() {
    updateCanvasSize()
    setupEventListeners()
    setMode("edit")
  }

  init()
})


