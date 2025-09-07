let projects = JSON.parse(localStorage.getItem('projects')) || [];
let pieChart, barChart;
let editingIndex = -1;

// Theme toggle
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  let theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

// Update dashboard summary
function updateDashboard() {
  let totalPaid = 0, totalDue = 0, totalOverdue = 0;
  const today = new Date().toISOString().split('T')[0];
  projects.forEach(p => {
    totalPaid += p.paidAmount;
    let remaining = p.amount - p.paidAmount;
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
    let remaining = p.amount - p.paidAmount;
    let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
    if (remaining > 0 && p.dueDate < today) status = 'Overdue';
    if (filter === 'fullyPaid' && status !== 'Fully Paid') return;
    if (filter === 'partial' && status !== 'Partial') return;
    if (filter === 'unpaid' && status !== 'Unpaid') return;
    if (filter === 'overdue' && status !== 'Overdue') return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.client}</td><td>${p.project}</td><td>$${p.amount.toFixed(2)}</td><td>$${p.paidAmount.toFixed(2)}</td><td>$${remaining.toFixed(2)}</td><td>${p.dueDate}</td><td>${status}</td><td><button onclick="editProject(${i})">Edit</button><button onclick="deleteProject(${i})" style="background:#ef4444;">Delete</button></td>`;
    table.appendChild(tr);
  });
  localStorage.setItem('projects', JSON.stringify(projects));
  updateDashboard();
}

// Event listener for form submission
const form = document.getElementById('projectForm');
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    client: document.getElementById('client').value,
    project: document.getElementById('project').value,
    amount: parseFloat(document.getElementById('amount').value),
    paidAmount: parseFloat(document.getElementById('paidAmount').value),
    dueDate: document.getElementById('dueDate').value
  };
  if (editingIndex >= 0) { projects[editingIndex] = data; editingIndex = -1; } else { projects.push(data); }
  form.reset();
  renderTable();
});

// Edit a project
function editProject(i) {
  editingIndex = i;
  const p = projects[i];
  document.getElementById('client').value = p.client;
  document.getElementById('project').value = p.project;
  document.getElementById('amount').value = p.amount;
  document.getElementById('paidAmount').value = p.paidAmount;
  document.getElementById('dueDate').value = p.dueDate;
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
    let remaining = p.amount - p.paidAmount;
    let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
    if (remaining > 0 && p.dueDate < today) status = 'Overdue';
    csv += `"${p.client}","${p.project}","${p.amount}","${p.paidAmount}","${remaining}","${p.dueDate}","${status}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Export data to PDF
function exportPDF() {
  if (typeof jsPDF === 'undefined') { alert('jsPDF library failed to load.'); return; }
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Freelancer Tracker', 10, 15);
  doc.setFontSize(12);
  let y = 25;
  doc.text('Client | Project | Total | Paid | Remaining | Due | Status', 10, y);
  y += 8;
  const today = new Date().toISOString().split('T')[0];
  projects.forEach(p => {
    let remaining = p.amount - p.paidAmount;
    let status = remaining <= 0 ? 'Fully Paid' : (remaining < p.amount ? 'Partial' : 'Unpaid');
    if (remaining > 0 && p.dueDate < today) status = 'Overdue';
    doc.text(`${p.client} | ${p.project} | $${p.amount} | $${p.paidAmount} | $${remaining} | ${p.dueDate} | ${status}`, 10, y);
    y += 8;
    if (y > 280) { doc.addPage(); y = 20; }
  });
  doc.save('projects.pdf');
}

// Update charts
function updateCharts() {
  const today = new Date().toISOString().split('T')[0];
  let fullyPaid = 0, partial = 0, unpaid = 0, overdue = 0;
  let totalPaid = 0, totalRemaining = 0, totalOverdue = 0;
  projects.forEach(p => {
    let remaining = p.amount - p.paidAmount;
    totalPaid += p.paidAmount;
    totalRemaining += remaining > 0 ? remaining : 0;
    if (remaining > 0 && p.dueDate < today) { overdue++; totalOverdue += remaining; }
    if (remaining <= 0) fullyPaid++;
    else if (remaining < p.amount) partial++;
    else unpaid++;
  });
  const pieData = { labels: ['Fully Paid', 'Partial', 'Unpaid', 'Overdue'], datasets: [{ data: [fullyPaid, partial, unpaid, overdue], backgroundColor: ['#10b981', '#3b82f6', '#fbbf24', '#ef4444'] }] };
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('projectsPieChart'), { type: 'pie', data: pieData });
  const barData = { labels: ['Total Paid', 'Remaining', 'Overdue'], datasets: [{ label: 'Amount ($)', data: [totalPaid, totalRemaining, totalOverdue], backgroundColor: ['#10b981','#fbbf24','#ef4444'] }] };
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('amountsBarChart'), { type: 'bar', data: barData, options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });
}

// Initial render
document.addEventListener('DOMContentLoaded', renderTable);
document.getElementById('filterStatus').addEventListener('change', renderTable);