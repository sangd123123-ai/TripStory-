import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import adminStatsService from "../services/adminStatsService";

export default function AdminHome() {
  const visitorChartRef = useRef(null);
  const stampChartRef = useRef(null);
  const visitorChartInstance = useRef(null);
  const stampChartInstance = useRef(null);

  const [todayVisitors, setTodayVisitors] = useState(0);
  const [totalUsers, setTotalUsers] = useState(null);
  const [masterCount, setMasterCount] = useState(null);

  // KST 기준 날짜 라벨 (최근 7일)
  const build7DayLabels = (items) => {
    return items.map(({ dateStart }) => {
      const d = new Date(dateStart);
      const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const mm = String(k.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(k.getUTCDate()).padStart(2, "0");
      return `${mm}.${dd}`;
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadStatsAndRender() {
      try {
        // 5개 API 병렬 호출
        const [today, last7, stampStats, totalUsersRes, masterCountRes] =
          await Promise.all([
            adminStatsService.getTodayVisitors().catch(() => null),
            adminStatsService.getLast7Days().catch(() => null),
            adminStatsService.getStampStats().catch(() => ({})),
            adminStatsService.getTotalUsers().catch(() => null),
            adminStatsService.getMasterCount().catch(() => null),
          ]);

        if (!isMounted) return;

        setTodayVisitors(today?.count ?? 0);
        setTotalUsers(totalUsersRes?.count ?? 0);
        setMasterCount(masterCountRes?.count ?? 0);

        const items = Array.isArray(last7?.items) ? last7.items : [];
        const labels = build7DayLabels(items);
        const data = items.map((x) => x.count);

        // 캔버스 컨텍스트
        const ctx1 = visitorChartRef.current.getContext("2d");
        const ctx2 = stampChartRef.current.getContext("2d");

        // 기존 차트 파괴 (중복 방지)
        if (visitorChartInstance.current) visitorChartInstance.current.destroy();
        if (stampChartInstance.current) stampChartInstance.current.destroy();

        // 2-1) 방문자 추이(최근 7일) — 라인 차트
        visitorChartInstance.current = new Chart(ctx1, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "방문자 수",
                data,
                borderColor: "#1a73e8",
                backgroundColor: "rgba(26,115,232,0.1)",
                fill: true,
                tension: 0.3,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          },
        });

        // 2-2) 스탬프 등급 분포 — 실제값 연동
        const labelsStamp = Object.keys(stampStats);
        const dataStamp = Object.values(stampStats);

        stampChartInstance.current = new Chart(ctx2, {
          type: "doughnut",
          data: {
            labels: labelsStamp,
            datasets: [
              {
                data: dataStamp,
                backgroundColor: ["#cd7f32", "#c0c0c0", "#ffd700", "#00bcd4", "#673ab7"],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            radius: "90%",
            plugins: { legend: { position: "bottom" } },
          },
        });
      } catch (err) {
        console.error("[AdminHome] loadStatsAndRender error:", err);
      }
    }

    loadStatsAndRender();

    return () => {
      isMounted = false;
      if (visitorChartInstance.current) visitorChartInstance.current.destroy();
      if (stampChartInstance.current) stampChartInstance.current.destroy();
    };
  }, []);

  return (
    <div className="admin-dashboard" style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "20px", color: "#1a2980" }}>관리자 대시보드</h1>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        {[
          { title: "오늘 방문자", value: `${todayVisitors}명` },
          { title: "전체 회원 수", value: totalUsers != null ? `${totalUsers}명` : "—" },
          { title: "마스터 등급", value: masterCount != null ? `${masterCount}명` : "—" },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: "white",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#1a2980", marginBottom: "10px" }}>{card.title}</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: "#26d0ce" }}>{card.value}</p>
          </div>
        ))}
      </div>

      <section
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ color: "#1a2980", marginBottom: "16px" }}>최근 7일 방문자 수</h2>
        <canvas ref={visitorChartRef} height="120"></canvas>
      </section>

      <section
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          maxWidth: 450,
          width: "100%",
          margin: "0",
        }}
      >
        <h2 style={{ color: "#1a2980", marginBottom: "16px" }}>스탬프 등급 분포</h2>
        <div style={{ position: "relative", width: "100%", height: 300 }}>
          <canvas ref={stampChartRef} />
        </div>
      </section>
    </div>
  );
}