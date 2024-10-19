// Add JSZip to your script (if not using a module bundler)
const JSZip = window.JSZip;

// Elements
const finishGroupBtn = document.getElementById('finish-group');
const captureImageBtn = document.getElementById('capture-image');
const redoGroupBtn = document.getElementById('redo-group');
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const groupsContainer = document.getElementById('groups');

let currentStream = null;
let currentGroup = null;
let groupIdCounter = 0;
let groups = {};

// Start the camera automatically when the page loads with 1080p resolution
window.onload = async () => {
  await startCamera();
  createNewGroup(); // Automatically create a new group on page load
};

// Function to start the camera with 1080p resolution constraints
async function startCamera() {
  const videoConstraints = {
    video: {
      facingMode: 'environment', // Use rear camera
      width: { ideal: 1920 },    // Request 1080p resolution (1920x1080)
      height: { ideal: 1080 }
    }
  };

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      video.srcObject = currentStream;
      video.style.display = 'block';
    } catch (err) {
      console.error('Error accessing the camera:', err);
      alert('Error accessing the camera. Please ensure you have granted permission and are using Safari on iOS 11.3 or later.');
    }
  } else {
    alert('Camera not supported on this device.');
  }
}

// Automatically create a new group without prompting the user
function createNewGroup() {
  groupIdCounter++;
  const groupId = `group-${groupIdCounter}`;
  groups[groupId] = [];
  currentGroup = { id: groupId, images: [] };
  renderGroups();
  
  // Enable buttons for capturing, finishing, and redoing the group
  captureImageBtn.disabled = false;
  finishGroupBtn.disabled = false;
  redoGroupBtn.disabled = false;
}

// Capture image
captureImageBtn.addEventListener('click', () => {
  if (!currentGroup) {
    alert('No active group. Please refresh the page.');
    return;
  }

  // Get the native resolution of the video feed
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  
  // Set the canvas size to the video feed's resolution (max resolution of camera)
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  // Draw the video feed onto the canvas with its native resolution
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, videoWidth, videoHeight);

  // Convert canvas to Blob (instead of Base64)
  canvas.toBlob(function(blob) {
    addImageToGroup(currentGroup.id, blob); // Pass Blob instead of base64
  }, 'image/png');
});

// Redo current group (clear all images in the group)
redoGroupBtn.addEventListener('click', () => {
  if (currentGroup) {
    clearGroupImages(currentGroup.id);
  } else {
    alert('No active group to clear.');
  }
});

// Finish current group and export as ZIP
finishGroupBtn.addEventListener('click', () => {
  if (currentGroup && groups[currentGroup.id].length > 0) {
    exportGroupAsZip(currentGroup.id);
  } else {
    alert('No images to export in the current group.');
  }
});

// Clear all images in the current group without creating a new group
function clearGroupImages(groupId) {
  groups[groupId] = [];
  renderGroups();
}

function addImageToGroup(groupId, imageBlob) {
  groups[groupId].push(imageBlob); // Store Blob objects instead of base64 strings
  renderGroups();
}

function renderGroups() {
  groupsContainer.innerHTML = '';
  for (const groupId in groups) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group';

    const title = document.createElement('h3');
    title.textContent = `Group ${groupId}`;
    groupDiv.appendChild(title);

    groups[groupId].forEach((blob, index) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(blob);
      img.src = url;
      img.className = 'image';
      groupDiv.appendChild(img);
    });

    groupsContainer.appendChild(groupDiv);
  }
}

function exportGroupAsZip(groupId) {
  const zip = new JSZip();

  // Add images to the ZIP
  const groupFolder = zip.folder(groupId);
  groups[groupId].forEach((blob, index) => {
    groupFolder.file(`image_${index + 1}.png`, blob); // Add Blob directly to ZIP file
  });

  // Generate the ZIP file and trigger download
  zip.generateAsync({ type: 'blob' }).then(function(content) {
    const filename = `image_group_${Date.now()}.zip`;

    // Create a link to download the ZIP file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(link.href);

    // Clear the old group and automatically create a new group
    groups = {};
    renderGroups();
    createNewGroup(); // Automatically start a new group
  }).catch(function(error) {
    console.error('Error generating ZIP file:', error);
    alert('Failed to export data.');
  });
}
