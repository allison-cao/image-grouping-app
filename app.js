// Add JSZip to your script (if not using a module bundler)
const JSZip = window.JSZip;

// Elements
const startCameraBtn = document.getElementById('start-camera');
const captureImageBtn = document.getElementById('capture-image');
const createGroupBtn = document.getElementById('create-group');
const exportDataBtn = document.getElementById('export-data');
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const groupsContainer = document.getElementById('groups');

let currentStream = null;
let currentGroup = null;
let groupIdCounter = 0;
let groups = {};

// Start the camera
startCameraBtn.addEventListener('click', async () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      video.srcObject = currentStream;
      video.style.display = 'block';
      captureImageBtn.disabled = false;
    } catch (err) {
      console.error('Error accessing the camera:', err);
      alert('Error accessing the camera. Please ensure you have granted permission and are using Safari on iOS 11.3 or later.');
    }
  } else {
    alert('Camera not supported on this device.');
  }
});

// Capture image
captureImageBtn.addEventListener('click', () => {
  if (!currentGroup) {
    alert('Please create a group first.');
    return;
  }

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL('image/png');

  addImageToGroup(currentGroup.id, imageData);
});

// Create a new group
createGroupBtn.addEventListener('click', () => {
  groupIdCounter++;
  const groupId = `group-${groupIdCounter}`;
  groups[groupId] = [];
  currentGroup = { id: groupId, images: [] };
  renderGroups();
});

// Export data to a ZIP file
exportDataBtn.addEventListener('click', () => {
  exportData();
});

function addImageToGroup(groupId, imageData) {
  groups[groupId].push(imageData);
  if (groups[groupId].length >= 5) {
    captureImageBtn.disabled = true;
  }
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

    groups[groupId].forEach((imageData, index) => {
      const img = document.createElement('img');
      img.src = imageData;
      img.className = 'image';
      groupDiv.appendChild(img);
    });

    groupsContainer.appendChild(groupDiv);
  }
}

function exportData() {
  const zip = new JSZip();

  // Add group data as a JSON file
  const dataStr = JSON.stringify(groups, null, 2);
  zip.file('groups.json', dataStr);

  // Add images to the ZIP
  Object.keys(groups).forEach(groupId => {
    const groupFolder = zip.folder(groupId);

    groups[groupId].forEach((imageData, index) => {
      // Convert base64 to binary data
      const base64Data = imageData.replace(/^data:image\/(png|jpeg);base64,/, '');
      const imgBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Determine image extension
      const ext = imageData.startsWith('data:image/png') ? 'png' : 'jpeg';

      groupFolder.file(`image_${index + 1}.${ext}`, imgBuffer, { binary: true });
    });
  });

  // Generate the ZIP file and trigger download
  zip.generateAsync({ type: 'blob' }).then(function(content) {
    const filename = `image_groups_${Date.now()}.zip`;

    // Create a link to download the ZIP file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(link.href);

    alert('Data exported and ready for download.');

    // Optionally, clear the data after export
    groups = {};
    renderGroups();
  }).catch(function(error) {
    console.error('Error generating ZIP file:', error);
    alert('Failed to export data.');
  });
}
