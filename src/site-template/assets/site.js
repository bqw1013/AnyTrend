/**
 * Shared client-side behavior for all generated Daily Site pages.
 *
 * - Highlights the current top-nav link.
 * - Activates sidebar links while scrolling through sections.
 * - Toggles the mobile sidebar.
 * - Expands/collapses long category and angle lists.
 * - Shows a back-to-top button after scrolling down.
 */

(function () {
	const currentPage = document.body.dataset.page;
	if (currentPage) {
		document.querySelectorAll('.page-link').forEach((link) => {
			const href = link.getAttribute('href');
			if (href) {
				const pageName = href.replace(/\.html$/, '') || 'index';
				link.classList.toggle('active', pageName === currentPage);
			}
		});
	}

	const sections = document.querySelectorAll('main section[id]');
	const sidebarLinks = document.querySelectorAll('.sidebar-list a[href^="#"]');
	const toggleBtn = document.querySelector('.sidebar-toggle');
	const toggleTargetId = toggleBtn?.getAttribute('aria-controls');
	const sidebarList = toggleTargetId ? document.getElementById(toggleTargetId) : null;

	function updateActiveSidebarLink() {
		let currentId = '';
		for (const section of sections) {
			if (section.getBoundingClientRect().top <= 120) {
				currentId = section.id;
			}
		}
		for (const link of sidebarLinks) {
			const href = link.getAttribute('href');
			link.classList.toggle('active', href === '#' + currentId);
		}
	}

	if (sections.length > 0 && sidebarLinks.length > 0) {
		window.addEventListener('scroll', updateActiveSidebarLink);
		updateActiveSidebarLink();
	}

	if (toggleBtn && sidebarList) {
		toggleBtn.addEventListener('click', () => {
			const isOpen = sidebarList.classList.toggle('open');
			toggleBtn.setAttribute('aria-expanded', String(isOpen));
			const collapseLabel = toggleBtn.dataset.collapseLabel || '收起';
			const expandLabel = toggleBtn.dataset.expandLabel || '展开';
			toggleBtn.textContent = isOpen ? collapseLabel : expandLabel;
		});
	}

	document.querySelectorAll('.expand-items').forEach((button) => {
		button.addEventListener('click', () => {
			const targetId = button.getAttribute('aria-controls');
			const target = targetId ? document.getElementById(targetId) : null;
			if (!target) return;

			const isCollapsed = target.classList.toggle('collapsed');
			button.setAttribute('aria-expanded', String(!isCollapsed));
			button.textContent = isCollapsed
				? `${button.dataset.expandText || '展开全部'} (${button.dataset.remainingCount})`
				: (button.dataset.collapseText || '收起');
		});
	});

	const backToTop = document.querySelector('.back-to-top');
	if (backToTop) {
		function toggleBackToTop() {
			backToTop.classList.toggle('visible', window.scrollY > 400);
		}
		window.addEventListener('scroll', toggleBackToTop);
		toggleBackToTop();
		backToTop.addEventListener('click', () => {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
	}
})();
