<script setup lang="ts">
const props = defineProps({
  activeTab: {
    type: String,
    default: 'search'
  }
})
</script>

<template>
  <section class="panel" data-panel="search" v-if="activeTab === 'search'">
    <div class="search-panel-grid">
      <div class="retrieval-form card">
        <h3 style="margin-bottom:12px;" data-zh="实时检索调试" data-en="Live retrieval debug">实时检索调试</h3>
        <div class="field">
          <label class="field-label" data-zh="查询" data-en="Query">查询</label>
          <textarea class="textarea" rows="3" data-zh-placeholder="例如:预警系统的三层架构是什么?" data-en-placeholder="e.g. What is the 3-layer architecture of the alert system?" placeholder="例如:预警系统的三层架构是什么?"></textarea>
        </div>
        <div class="field">
          <label class="field-label">top_k = 5</label>
          <input type="range" min="1" max="20" value="5" />
        </div>
        <div class="field">
          <label class="field-label">threshold = 0.0</label>
          <input type="range" min="0" max="1" step="0.05" value="0" />
        </div>
        <div class="field">
          <label class="field-label">hybrid_weight (vector : bm25) = 0.5</label>
          <input type="range" min="0" max="1" step="0.05" value="0.5" />
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn btn-primary" data-zh="运行检索" data-en="Run retrieval">运行检索</button>
          <span class="help" data-zh="P95 ≤ 200ms (本地)" data-en="P95 ≤ 200ms (local)">P95 ≤ 200ms (本地)</span>
        </div>
      </div>
      <div class="results-list">
        <h3 style="margin-bottom:12px;" data-zh="命中切片" data-en="Top chunks">命中切片</h3>
        <div class="result">
          <div class="head">
            <span class="file">设计方案 v3.pdf · #ch-12</span>
            <span class="score">0.92</span>
          </div>
          <p class="snippet">预警系统采用三层架构: <mark>数据采集层</mark>(IoT 传感器实时采集水位、雨量、流速), <mark>边缘计算层</mark>(现场 PLC 完成阈值判定), <mark>云端服务层</mark>(聚合分析 + 推送告警)。</p>
        </div>
        <div class="result">
          <div class="head">
            <span class="file">告警运维记录 2025Q4.md · #ch-04</span>
            <span class="score">0.84</span>
          </div>
          <p class="snippet">2025-11-12 凌晨雨量阈值由 30mm/h 调整为 25mm/h,主要因为 11 月初两起<mark>误报</mark>复盘后修订。</p>
        </div>
        <div class="result">
          <div class="head">
            <span class="file">设计方案 v3.pdf · #ch-13</span>
            <span class="score">0.78</span>
          </div>
          <p class="snippet">告警推送渠道:短信、邮件、企业微信、监控大屏。优先级 P0 同步电话呼叫值班员。</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.search-panel-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.retrieval-form .field + .field { margin-top: 12px; }
.results-list .result {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;
  font-size: 13px;
}
.results-list .result .head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.results-list .result .file { font-weight: 500; font-size: 12.5px; }
.results-list .result .score {
  font-family: var(--font-mono); font-size: 11.5px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 6px; border-radius: 4px;
}
.results-list .snippet { color: var(--muted); line-height: 1.55; font-size: 12.5px; }
.results-list .snippet mark { background: oklch(96% 0.10 90); color: oklch(30% 0.10 60); padding: 0 2px; border-radius: 2px; }
</style>
