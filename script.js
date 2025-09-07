// script.js - Updated with a fix for data compatibility

let projects = JSON.parse(localStorage.getItem('projects')) || [];
let pieChart, barChart;
let editingIndex = -1; // Used to track the project being edited or receiving a payment

// Helper function to handle data compatibility from old app version
function normalizeProjects(projects) {
    return projects.map(p => {
        // If the project doesn't have a payments array but has a paidAmount, it's an old entry
        if (!p.payments && typeof p.paidAmount !== 'undefined') {
            const paidAmount = p.paidAmount;
            delete p.paidAmount; // Remove the old property
            p.payments = paidAmount > 0 ? [{
                date: new Date().toISOString().split('T')[0],
                amount: paidAmount
            }] : [];
        }
        return p;
    });
}

// Normalize projects loaded from localStorage
projects = normalizeProjects(projects);

// UI elements
const themeToggleBtn = document.getElementById('themeToggle');
const projectForm = document.getElementById('projectForm');
const paymentModal = document.getElementById('paymentModal');
const closeBtn = document.querySelector('.close-button');
const paymentHistoryTableBody = document.querySelector('#paymentHistoryTable tbody');
const addPaymentForm = document.getElementById('addPaymentForm');

// Theme toggle
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

// Helper function to calculate total paid amount for a project
function getTotalPaid(project) {
    return project.payments.reduce((sum, p) => sum + p.amount, 0);
}

// Update dashboard summary
function updateDashboard() {
    let totalPaid = 0, totalDue = 0, totalOverdue = 0;
    const today = new Date().toISOString().split('T')[0];
    projects.forEach(p => {
        const totalProjectPaid = getTotalPaid(p);
        const remaining = p.amount - totalProjectPaid;
        totalPaid += totalProjectPaid;
        totalDue += remaining > 0 ? remaining : 0;
        if (remaining > 0 && p.dueDate < today) totalOverdue += remaining;
    });
    document.getElementById('totalDue').textContent = '$' + totalDue.toFixed(2);
    document.getElementById('totalPaid').textContent = '$' + totalPaid.toFixed(2);
    document.getElementById('totalOverdue').textContent = '$' + totalOverdue.toFixed(2);
    updateCharts();
}

// Render the project table
function renderTable() {
    const table = document.getElementById('projectTable');
    table.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    const filter = document.getElementById('filterStatus').value;

    projects.forEach((p, i) => {
        const totalPaid = getTotalPaid(p);
        const remaining = p.amount - totalPaid;
        let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
        if (remaining > 0 && p.dueDate < today) status = 'Overdue';

        if (filter === 'fullyPaid' && status !== 'Fully Paid') return;
        if (filter === 'partial' && status !== 'Partial') return;
        if (filter === 'unpaid' && status !== 'Unpaid') return;
        if (filter === 'overdue' && status !== 'Overdue') return;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.client}</td>
            <td>${p.project}</td>
            <td>$${p.amount.toFixed(2)}</td>
            <td>$${totalPaid.toFixed(2)}</td>
            <td>$${remaining.toFixed(2)}</td>
            <td>${p.dueDate}</td>
            <td>${status}</td>
            <td>
                <button onclick="viewPayments(${i})">Payments</button>
                <button onclick="editProject(${i})">Edit</button>
                <button onclick="deleteProject(${i})" style="background:#ef4444;">Delete</button>
            </td>
        `;
        table.appendChild(tr);
    });

    localStorage.setItem('projects', JSON.stringify(projects));
    updateDashboard();
}

// Event listener for adding/editing a project
projectForm.addEventListener('submit', e => {
    e.preventDefault();

    const client = document.getElementById('client').value;
    const project = document.getElementById('project').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const dueDate = document.getElementById('dueDate').value;

    if (editingIndex >= 0) {
        // Update existing project
        projects[editingIndex].client = client;
        projects[editingIndex].project = project;
        projects[editingIndex].amount = amount;
        projects[editingIndex].dueDate = dueDate;
        document.getElementById('projectForm button').textContent = "Save Project";
        editingIndex = -1;
    } else {
        // Create new project
        const newProject = {
            client: client,
            project: project,
            amount: amount,
            dueDate: dueDate,
            payments: []
        };
        projects.push(newProject);
    }
    projectForm.reset();
    renderTable();
});

// Event listener for adding a new payment
addPaymentForm.addEventListener('submit', e => {
    e.preventDefault();
    const newPayment = {
        date: document.getElementById('newPaymentDate').value,
        amount: parseFloat(document.getElementById('newPaymentAmount').value)
    };
    if (editingIndex >= 0) {
        projects[editingIndex].payments.push(newPayment);
        addPaymentForm.reset();
        viewPayments(editingIndex);
        renderTable();
    }
});

// View payments for a specific project
function viewPayments(i) {
    editingIndex = i; // Store the current project index for adding payments
    const project = projects[i];
    document.getElementById('modalTitle').textContent = `Payments for Project: ${project.project}`;
    paymentHistoryTableBody.innerHTML = '';
    project.payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.date}</td><td>$${p.amount.toFixed(2)}</td>`;
        paymentHistoryTableBody.appendChild(tr);
    });
    paymentModal.style.display = 'block';
}

// Close the modal
closeBtn.onclick = function() {
    paymentModal.style.display = 'none';
    editingIndex = -1; // Clear the index when closing
}
window.onclick = function(event) {
    if (event.target == paymentModal) {
        paymentModal.style.display = 'none';
        editingIndex = -1; // Clear the index when closing
    }
}

// Edit a project
function editProject(i) {
    editingIndex = i;
    const p = projects[i];
    document.getElementById('client').value = p.client;
    document.getElementById('project').value = p.project;
    document.getElementById('amount').value = p.amount;
    document.getElementById('dueDate').value = p.dueDate;
    document.getElementById('projectForm button').textContent = "Update Project";
}

// Delete a project
function deleteProject(i) {
    projects.splice(i, 1);
    renderTable();
}

// Export data to CSV
function exportCSV() {
    let csv = 'Client,Project,Total,Paid,Remaining,Due,Status\n';
    const today = new Date().toISOString().split('T')[0];
    projects.forEach(p => {
        const totalPaid = getTotalPaid(p);
        const remaining = p.amount - totalPaid;
        let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
        if (remaining > 0 && p.dueDate < today) status = 'Overdue';
        csv += `"${p.client}","${p.project}","${p.amount}","${totalPaid}","${remaining}","${p.dueDate}","${status}"\n`;
    });
    const blob = new Blob([csv], {
        type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Export data to PDF
function exportPDF() {
    if (typeof jsPDF === 'undefined') {
        alert('jsPDF library failed to load.');
        return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Freelancer Tracker', 10, 15);
    doc.setFontSize(12);
    let y = 25;
    doc.text('Client | Project | Total | Paid | Remaining | Due | Status', 10, y);
    y += 8;
    const today = new Date().toISOString().split('T')[0];
    projects.forEach(p => {
        const totalPaid = getTotalPaid(p);
        const remaining = p.amount - totalPaid;
        let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
        if (remaining > 0 && p.dueDate < today) status = 'Overdue';
        doc.text(`${p.client} | ${p.project} | $${p.amount} | $${totalPaid} | $${remaining} | ${p.dueDate} | ${status}`, 10, y);
        y += 8;
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    doc.save('projects.pdf');
}

// Update charts
function updateCharts() {
    const today = new Date().toISOString().split('T')[0];
    let fullyPaid = 0, partial = 0, unpaid = 0, overdue = 0;
    let totalPaid = 0, totalRemaining = 0, totalOverdue = 0;
    projects.forEach(p => {
        const totalProjectPaid = getTotalPaid(p);
        const remaining = p.amount - totalProjectPaid;
        totalPaid += totalProjectPaid;
        totalRemaining += remaining > 0 ? remaining : 0;
        if (remaining > 0 && p.dueDate < today) {
            overdue++;
            totalOverdue += remaining;
        }
        if (remaining <= 0) fullyPaid++;
        else if (remaining < p.amount) partial++;
        else unpaid++;
    });

    const pieData = {
        labels: ['Fully Paid', 'Partial', 'Unpaid', 'Overdue'],
        datasets: [{
            data: [fullyPaid, partial, unpaid, overdue],
            backgroundColor: ['#10b981', '#3b82f6', '#fbbf24', '#ef4444']
        }]
    };
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(document.getElementById('projectsPieChart'), {
        type: 'pie',
        data: pieData
    });

    const barData = {
        labels: ['Total Paid', 'Remaining', 'Overdue'],
        datasets: [{
            label: 'Amount ($)',
            data: [totalPaid, totalRemaining, totalOverdue],
            backgroundColor: ['#10b981', '#fbbf24', '#ef4444']
        }]
    };
    if (barChart) barChart.destroy();
    barChart = new Chart(document.getElementById('amountsBarChart'), {
        type: 'bar',
        data: barData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initial render
document.addEventListener('DOMContentLoaded', renderTable);
document.getElementById('filterStatus').addEventListener('change', renderTable);
