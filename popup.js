document.addEventListener('DOMContentLoaded', () => {
    const statusMsg = document.getElementById('status-message');
    const selectionArea = document.getElementById('selection-area');
    const previewArea = document.getElementById('preview-area');
    const familyGenBtn = document.getElementById('family-gen-btn');
    const backBtn = document.getElementById('back-btn');
    const downloadBtn = document.getElementById('download-btn');
    const downloadFrontBtn = document.getElementById('download-front-btn');
    const cardWrap = document.getElementById('card-wrap');

    let extractedData = null;

    // 1. Initial Data Extraction
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url.includes('epds.telangana.gov.in')) {
            chrome.tabs.sendMessage(activeTab.id, { action: "extract" }, (response) => {
                if (response && response.details && response.details.fscNo) {
                    extractedData = response;
                    statusMsg.classList.add('hidden');
                    selectionArea.classList.remove('hidden');
                    document.getElementById('display-fsc').innerText = "FSC NO: " + response.details.fscNo;
                } else {
                    statusMsg.innerText = "Please search for a Ration Card first.";
                }
            });
        }
    });

    familyGenBtn.addEventListener('click', () => {
        selectionArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        renderTwoSidesUnified();
    });

    backBtn.addEventListener('click', () => {
        previewArea.classList.add('hidden');
        selectionArea.classList.remove('hidden');
    });

    function renderTwoSidesUnified() {
        const details = extractedData.details;
        const members = extractedData.members;

        // Filter out HOF from the list (HOF is already in the footer)
        const filteredMembers = members.filter(m => m.name.trim().toUpperCase() !== details.hof.trim().toUpperCase());
        const frontMembers = filteredMembers.slice(0, 6);
        const backMembers = filteredMembers.length > 6 ? filteredMembers.slice(6, 12) : [];

        // Create Data URL for QR (pointing to your GitHub Pages viewer with encoded data)
        // Optimized: only encode necessary data to keep QR density low and scannable
        const qrData = {
            f: details.fscNo,
            r: details.fscRefNo,
            h: details.hof,
            d: details.district,
            g: details.gasConnection,
            c: details.consumerNo,
            s: details.fpShopNo,
            o: details.oldRCNo,
            m: members.map(m => m.name.substring(0, 20)) // Keep names short for QR
        };

        // Use btoa with encodeURIComponent for safe URL passing
        const encodedData = btoa(encodeURIComponent(JSON.stringify(qrData)));
        const qrUrl = `https://purnappc9.github.io/fscPVC/viewer.html?d=${encodedData}`; // Changed # to ? for better parameter handling

        // Increased size to 250 and added margin=0 for better display in the small box
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&margin=0&ecc=L`;

        const generateSideHtml = (sideId, sideTitle, memberList) => {
            const memberRows = memberList.map(m => `<tr><td style="width:22px; color:#aaa;">${m.sno}</td><td style="font-weight:700;">${m.name}</td></tr>`).join('');

            return `
                <div id="${sideId}" class="pvc-card">
                    <div class="card-header">${sideTitle} - TELANGANA (${details.district || 'WARANGAL'})</div>
                    <div class="card-content-split">
                        <div class="info-side fsc-main-number">
                            <div><label>FSC NUMBER</label><strong>${details.fscNo || '---'}</strong></div>
                            <div><label>REF NO</label><strong>${details.fscRefNo || '---'}</strong></div>
                            <div><label>DISTRICT</label><strong>${details.district || '---'}</strong></div>
                            <div><label>OLD RCNO</label><strong>${details.oldRCNo || '---'}</strong></div>
                            <div><label>GAS</label><strong>${details.gasConnection || '---'}</strong></div>
                            <div><label>CONSUMER NO</label><strong>${details.consumerNo || '---'}</strong></div>
                            <div style="border:none;"><label>SHOP NO</label><strong>${details.fpShopNo || '---'}</strong></div>
                        </div>
                        <div class="list-side">
                            <table class="family-table">
                                <thead><tr><th>#</th><th>FAMILY MEMBER NAME</th></tr></thead>
                                <tbody>${memberRows || '<tr><td colspan="2" style="text-align:center; padding-top:20px; color:#ccc;">NO MORE MEMBERS</td></tr>'}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="hof-label">HOF: ${details.hof}</div>
                        <div class="qr-box">
                            <img src="${qrImg}" width="42" height="42">
                        </div>
                    </div>
                </div>
            `;
        };

        cardWrap.innerHTML = `
            ${generateSideHtml('card-front', 'FSC FAMILY CARD FRONT', frontMembers)}
            <div style="margin-top: 20px;">
                ${generateSideHtml('card-back', 'FSC FAMILY CARD BACK', backMembers)}
            </div>
        `;
    }

    downloadFrontBtn.addEventListener('click', async () => {
        const el = document.getElementById('card-front');
        const canvas = await html2canvas(el, {
            scale: 6,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 330,
            height: 210
        });
        const link = document.createElement('a');
        link.download = `FSC_Front_${extractedData.details.fscNo}.png`;
        link.href = canvas.toContentDataURL ? canvas.toContentDataURL('image/png', 1.0) : canvas.toDataURL('image/png', 1.0);
        link.click();
    });

    downloadBtn.addEventListener('click', async () => {
        const sides = ['card-front', 'card-back'];
        for (const sideId of sides) {
            const el = document.getElementById(sideId);
            const canvas = await html2canvas(el, {
                scale: 6,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 330,
                height: 210
            });
            const link = document.createElement('a');
            link.download = `FSC_${sideId === 'card-front' ? 'Front' : 'Back'}_${extractedData.details.fscNo}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            await new Promise(r => setTimeout(r, 600));
        }
    });
});
