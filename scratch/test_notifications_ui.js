const puppeteer = require("c:\\Project\\staytrack\\node_modules\\puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = path.resolve(__dirname, "..");

async function testNotificationsUI() {
  console.log("=== STARTING NOTIFICATION UI VERIFICATION ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Mock authenticated user with sample notifications
  await page.evaluateOnNewDocument(() => {
    const userObj = {
      uid: "host-test-uid",
      id: "host-test-uid",
      role: "host",
      name: "StayTrack Host",
      email: "host@staytrack.com",
    };
    localStorage.setItem("staytrack_token", "test-token");
    localStorage.setItem("staytrack_user", JSON.stringify(userObj));
    sessionStorage.setItem("staytrack_user_profile", JSON.stringify(userObj));

    // Mock window.fetch for notifications API to guarantee sample data
    const originalFetch = window.fetch;
    window.fetch = async function (url, options) {
      const urlStr = url ? url.toString() : "";
      if (urlStr.includes("/api/notifications/unread/count")) {
        return new Response(JSON.stringify({ count: 3 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/api/notifications/read-all")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/api/notifications") && urlStr.includes("/read")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/api/notifications")) {
        const sampleNotifs = [
          {
            notificationId: "notif-1",
            id: "notif-1",
            type: "BOOKING_CONFIRMED",
            title: "New Booking Request",
            message: "Guest Anshu confirmed reservation for Green Valley Villa.",
            body: "Guest Anshu confirmed reservation for Green Valley Villa.",
            relatedId: "prop-101",
            relatedType: "booking",
            read: false,
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
          },
          {
            notificationId: "notif-2",
            id: "notif-2",
            type: "MESSAGE_RECEIVED",
            title: "New Guest Message",
            message: "Is early check-in available at 11 AM?",
            body: "Is early check-in available at 11 AM?",
            relatedId: "conv-202",
            relatedType: "message",
            read: false,
            createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
          },
          {
            notificationId: "notif-3",
            id: "notif-3",
            type: "PAYMENT_SUCCESS",
            title: "Payout Initiated",
            message: "₹18,500 has been transferred to your connected bank account.",
            body: "₹18,500 has been transferred to your connected bank account.",
            relatedId: "pay-303",
            relatedType: "payment",
            read: false,
            createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3h ago
          },
          {
            notificationId: "notif-4",
            id: "notif-4",
            type: "SUBSCRIPTION_ACTIVE",
            title: "Host Pro Plan Active",
            message: "Your subscription renewal was processed successfully.",
            body: "Your subscription renewal was processed successfully.",
            relatedId: "sub-404",
            relatedType: "subscription",
            read: true,
            createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2d ago
          },
          {
            notificationId: "notif-5",
            id: "notif-5",
            type: "PROPERTY_APPROVED",
            title: "Property Approved",
            message: "Skyline Studio PG is now live and accepting direct bookings.",
            body: "Skyline Studio PG is now live and accepting direct bookings.",
            relatedId: "prop-505",
            relatedType: "property",
            read: true,
            createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // 5d ago
          },
        ];
        return new Response(JSON.stringify(sampleNotifs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch.apply(this, arguments);
    };
  });

  const report = {};

  // --- 1. HOST NOTIFICATION POPOVER TEST (1440px) ---
  console.log("\n[1] Testing Host Dashboard Notification Popover...");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/host", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  // Click notification bell
  const hostBell = await page.$('header button[aria-label="View notifications"]');
  if (!hostBell) throw new Error("Host notification bell button not found!");
  await hostBell.click();
  await new Promise((r) => setTimeout(r, 400));

  const hostPopoverInfo = await page.evaluate(() => {
    const pop = document.querySelector('div[aria-label="Notifications Drawer"]');
    if (!pop) return null;
    const rect = pop.getBoundingClientRect();
    const rows = pop.querySelectorAll('div[role="button"]');
    const viewAll = pop.querySelector('a[href="/notifications"]');
    const markAll = pop.querySelector('button');
    const unreadPill = pop.querySelector('span.tabular-nums');

    return {
      popoverExists: true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      rowCount: rows.length,
      hasViewAll: !!viewAll,
      hasMarkAll: !!markAll,
      unreadPillText: unreadPill ? unreadPill.textContent : null,
      firstRowTitle: rows[0] ? rows[0].querySelector("h4")?.textContent : null,
      firstRowTime: rows[0] ? rows[0].querySelector("span.tabular-nums")?.textContent : null,
      firstRowHasDot: rows[0] ? !!rows[0].querySelector("div.rounded-full.bg-primary") : false,
      firstRowHasIcon: rows[0] ? !!rows[0].querySelector("svg") : false,
    };
  });

  report.hostPopover = hostPopoverInfo;
  console.log("Host Popover Audit:", hostPopoverInfo);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "host_notification_popover.png"),
    fullPage: false,
  });

  // --- 2. MAIN WEBSITE NAVBAR NOTIFICATION POPOVER TEST ---
  console.log("\n[2] Testing Main Website Navbar Notification Popover...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  const guestBell = await page.$('header button[aria-label="View notifications"]');
  if (guestBell) {
    await guestBell.click();
    await new Promise((r) => setTimeout(r, 400));

    const guestPopoverInfo = await page.evaluate(() => {
      const pop = document.querySelector('div[aria-label="Notifications Drawer"]');
      if (!pop) return null;
      const rect = pop.getBoundingClientRect();
      const rows = pop.querySelectorAll('div[role="button"]');
      const viewAll = pop.querySelector('a[href="/notifications"]');

      return {
        popoverExists: true,
        width: Math.round(rect.width),
        rowCount: rows.length,
        hasViewAll: !!viewAll,
      };
    });
    report.guestPopover = guestPopoverInfo;
    console.log("Guest Popover Audit:", guestPopoverInfo);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "guest_notification_popover.png"),
      fullPage: false,
    });
  }

  // --- 3. FULL NOTIFICATIONS PAGE TEST (1440px) ---
  console.log("\n[3] Testing Full Notifications Page (/notifications)...");
  await page.goto("http://localhost:3000/notifications", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  const fullPageInfo = await page.evaluate(() => {
    const heading = document.querySelector("h1");
    const tabButtons = document.querySelectorAll("main button");
    const rows = document.querySelectorAll('main div[role="button"]');
    const markAllBtn = document.querySelector('main button:has(svg)');

    const tabs = Array.from(tabButtons).map((b) => b.textContent?.trim());

    return {
      headingText: heading ? heading.textContent : null,
      rowCount: rows.length,
      tabs: tabs.slice(0, 4),
      firstRowTitle: rows[0] ? rows[0].querySelector("h4")?.textContent : null,
      firstRowCategory: rows[0] ? rows[0].querySelector("span.capitalize")?.textContent : null,
      hasMarkAllBtn: !!markAllBtn,
      docWidth: document.documentElement.scrollWidth,
      winWidth: window.innerWidth,
    };
  });

  report.fullPageDesktop = fullPageInfo;
  console.log("Full Notifications Page Audit (Desktop):", fullPageInfo);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "notifications_full_page_desktop.png"),
    fullPage: false,
  });

  // Test "Unread" tab filter
  console.log("Testing 'Unread' Tab Filter...");
  await page.evaluate(() => {
    const unreadTab = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Unread")
    );
    if (unreadTab) unreadTab.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const unreadRowCount = await page.evaluate(() => {
    return document.querySelectorAll('main div[role="button"]').length;
  });
  report.unreadFilteredCount = unreadRowCount;
  console.log(`Unread Filtered Row Count: ${unreadRowCount} (Expected: 3 unread items)`);

  // Test "All" tab filter
  console.log("Testing 'All' Tab Filter...");
  await page.evaluate(() => {
    const allTab = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("All (")
    );
    if (allTab) allTab.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // --- 4. MOBILE VIEWPORT TEST (393px) ---
  console.log("\n[4] Testing Mobile Viewport (393px)...");
  await page.setViewport({ width: 393, height: 852 });
  await page.goto("http://localhost:3000/notifications", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));

  const mobileInfo = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const rows = document.querySelectorAll('main div[role="button"]');
    return {
      docWidth,
      winWidth,
      noHorizontalOverflow: docWidth <= winWidth,
      rowCount: rows.length,
    };
  });
  report.mobileAudit = mobileInfo;
  console.log("Mobile Audit (393px):", mobileInfo);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "notifications_full_page_mobile.png"),
    fullPage: false,
  });

  // Check mobile popover on /host
  await page.goto("http://localhost:3000/host", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));

  const mobileHostBell = await page.$('header button[aria-label="View notifications"]');
  if (mobileHostBell) {
    await mobileHostBell.click();
    await new Promise((r) => setTimeout(r, 300));

    const mobilePopWidth = await page.evaluate(() => {
      const pop = document.querySelector('div[aria-label="Notifications Drawer"]');
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return {
        popWidth: pop ? Math.round(pop.getBoundingClientRect().width) : 0,
        noHorizontalOverflow: docWidth <= winWidth,
      };
    });
    report.mobilePopover = mobilePopWidth;
    console.log("Mobile Popover Audit:", mobilePopWidth);
  }

  await browser.close();

  // Save results
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "scratch", "notification_test_results.json"),
    JSON.stringify(report, null, 2)
  );

  const passed =
    report.hostPopover?.popoverExists &&
    report.hostPopover?.rowCount > 0 &&
    report.hostPopover?.hasViewAll &&
    report.hostPopover?.firstRowHasIcon &&
    report.hostPopover?.firstRowHasDot &&
    report.fullPageDesktop?.rowCount > 0 &&
    report.unreadFilteredCount === 3 &&
    report.mobileAudit?.noHorizontalOverflow;

  console.log("\n==========================================");
  console.log(`FINAL RESULT: ${passed ? "ALL NOTIFICATION UI TESTS PASSED! ✅" : "TEST FAILURES DETECTED ❌"}`);
  console.log("==========================================");

  if (!passed) process.exit(1);
}

testNotificationsUI().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
