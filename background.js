chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // 페이지가 로드된 이후에 실행하기
    if (tab.url && tab.url.includes("external_tools/71")) {
      // '주차학습'에 들어갔을때 실행하기
      chrome.tabs.sendMessage(tabId, {
        type: "loaded",
        tabUrl: tab.url,
      });
    }
  }
});
