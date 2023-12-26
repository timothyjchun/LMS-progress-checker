(() => {
  let xn_api_token = "";
  let course_id = 0;
  let cookieObj = {};
  let weeklyLearnObj = {};
  let userHeaders = {};
  let titleToDOMObj = {};
  let iframeDocument = "";
  let today = new Date().toJSON();

  const cookieStringToObj = (string) => {
    let obj = {};
    string.forEach((cookie) => {
      obj[cookie.split("=")[0]] = cookie.split("=")[1];
    });
    return obj;
  };

  const getWeeklyLearn = async (course_id) => {
    let url = `https://canvas.ssu.ac.kr/learningx/api/v1/courses/${course_id}/modules?include_detail=true`;
    const res = await fetch(url, {
      method: "GET",
      headers: userHeaders,
    });
    let data = await res.json();
    return data;
  };

  const checkLectureOrAssignment = (data) => {
    if (data.content_type === "attendance_item") {
      if (
        data.content_data.item_content_data.content_type === "mp4" ||
        data.content_data.item_content_data.content_type === "movie" // theres also type 'movie'..?
      )
        return "lecture";
      else return "else";
    } else if (data.content_type === "assignment") return "assignment";
    else return "else";
  };

  const checkAttendanceAndDue = (attendance, dueDate) => {
    let attendanceCheckText = "";
    let attendanceCheckIconDiv = "";
    let color = "";
    let isUseAttendance = true;

    // 이미 수행을 완료 했거나 애초에 출석에 해당하지 않은 경우 먼저 처리
    // 이후에 시간을 체크 해서 시간이 아직 있을 때, 그리고 시간이 다 지났을 때 (지각, 결석) 처리 해주기!
    // 과제도 다른 함수 말고 같이 확인하기
    if (attendance === "attendance" || attendance === true) {
      if (attendance === true) {
        // 과제 완료
        attendanceCheckText = "😁 제출 완료";
        color = "#4CB9E7";
      } else {
        // 출석
        attendanceCheckText = "✅ 출석";
        color = "#05C517";
      }
    } else if (attendance === "none") {
      attendanceCheckText = "😉 출석 해당 없음";
      isUseAttendance = false;
    } else {
      // 과제 제출 X or 영상 시청 x
      if (dueDate > today) {
        //  아직 시간 있음
        // attendanceCheckText = ""
        const todayObj = new Date(today);
        const dueDateObj = new Date(dueDate);
        const diff = dueDateObj.getTime() - todayObj.getTime();
        const divider = 1000 * 60 * 60 * 24;
        if (diff / divider < 1) {
          // d-day
          attendanceCheckText = "🤯 D-DAY";
          color = "red";
        } else {
          const daysLeft = parseInt(diff / divider);
          if (daysLeft >= 5) {
            // 여유 있으~~
            attendanceCheckText = `🙂 D-${daysLeft}`;
            color = "gray";
          } else if (daysLeft < 5 && daysLeft >= 2) {
            // 조오금 서두르자
            attendanceCheckText = `😕 D-${daysLeft}`;
            color = "orange";
          } else if (daysLeft < 2) {
            // 얼른 끝내자!!
            attendanceCheckText = `😳 D-${daysLeft}`;
            color = "red";
          }
        }
      } else {
        if (attendance === false) {
          attendanceCheckText = "😢 미제출";
          color = "red";
        } else {
          if (attendance === "late") {
            // 지각
            attendanceCheckText = "🔶 지각";
            color = "orange";
          } else if (attendance === "absent") {
            // 결석
            attendanceCheckText = "❌ 결석";
            color = "red";
          }
        }
      }
    }
    const attendanceCheckNode = document.createTextNode(attendanceCheckText);
    attendanceCheckIconDiv = document.createElement("div");
    attendanceCheckIconDiv.appendChild(attendanceCheckNode);
    isUseAttendance
      ? (attendanceCheckIconDiv.style.fontSize = "1.7rem")
      : (attendanceCheckIconDiv.style.fontSize = "1.5rem");
    attendanceCheckIconDiv.style.color = color;
    return attendanceCheckIconDiv;
  };

  const getItemDOMLocation = () => {
    const iframe = document.getElementsByClassName("tool_launch")[0];
    let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    if (iframeDoc.readyState == "complete") {
      // iframe 내부의 document에 접근합니다.
      const iframeDocument = iframe.contentWindow.document;
      // iframe 내부에서 특정 클래스 이름을 가진 모든 div 요소를 가져옵니다.
      const divs = iframeDocument.getElementsByClassName(
        "xnmb-module_item-left-title-wrapper"
      );
      for (let i = 0; i < divs.length; i++) {
        const href = divs[i].firstChild.href;
        let codeNum = 0;
        if (href === undefined) {
        } else if (href.includes("external_tools")) {
          codeNum = parseInt(
            href.split("modules/items/")[1].split("?return_url")[0]
          );
        } else {
          codeNum = parseInt(href.split("items/")[1]);
        }
        titleToDOMObj[codeNum] = divs[i];
      }
      return iframeDocument;
    }
  };

  const getParentElement = (module_item_id) => {
    return titleToDOMObj[module_item_id].parentElement.parentElement;
  };

  const checkProgress = async (data) => {
    for (let i = 0; i < data.length; i++) {
      let weekData = data[i];
      let moduleItems = weekData["module_items"];
      for (let j = 0; j < moduleItems.length; j++) {
        let moduleItem = moduleItems[j]; // 주차학습의 아이템 하나
        let title = moduleItem.title;
        let module_item_id = moduleItem.module_item_id;
        let moduleItemType = checkLectureOrAssignment(moduleItem);
        if (moduleItemType === "lecture") {
          let content_id = moduleItem.content_id;
          let url = `https://canvas.ssu.ac.kr/learningx/api/v1/courses/${course_id}/attendance_items/${content_id}`;
          let res = await fetch(url, {
            method: "GET",
            headers: userHeaders,
          });
          let itemData = await res.json();
          let dueDate = itemData.due_at;
          let attendance = itemData.attendance_data.attendance_status;
          let attendanceCheckIconDiv = checkAttendanceAndDue(
            attendance,
            dueDate
          ); // 마감 기한 아직 아닌 거는?
          let parentElement = getParentElement(module_item_id);
          parentElement.children[1].after(attendanceCheckIconDiv);
        } else if (moduleItemType === "assignment") {
          let content_id = moduleItem.content_id;
          //   let url = `https://canvas.ssu.ac.kr/courses/${course_id}/assignments/${content_id}?module_item_id=${module_item_id}`;
          let url = `https://canvas.ssu.ac.kr/api/v1/courses/${course_id}/assignments/${content_id}`;
          let res = await fetch(url, {
            method: "GET",
            headers: {
              Cookie: document.cookie,
            },
          });
          let itemHTML = await res.text();
          let has_submitted_submissions = itemHTML
            .split('"has_submitted_submissions":')[1]
            .slice(0, 4);
          has_submitted_submissions =
            has_submitted_submissions === "true" ? true : false;
          let dueDate = moduleItem.content_data.due_at;
          let attendanceCheckIconDiv = checkAttendanceAndDue(
            has_submitted_submissions,
            dueDate
          );
          let parentElement = getParentElement(module_item_id);
          parentElement.children[1].after(attendanceCheckIconDiv);
        } else {
        } // else pass
      }
    }
  };

  chrome.runtime.onMessage.addListener(async (obj, sender, response) => {
    const { type, tabUrl } = obj;
    if (type === "loaded") {
      //  new page has been loaded
      let cookieString = document.cookie.split("; ");
      cookieObj = cookieStringToObj(cookieString);
      xn_api_token = cookieObj["xn_api_token"];
      course_id = tabUrl
        .split("external_tools/71")[0]
        .split("/courses/")[1]
        .slice(0, -1);
      userHeaders = {
        Cookie: document.cookie,
        Authorization: `Bearer ${xn_api_token}`,
      };
      weeklyLearnObj = await getWeeklyLearn(course_id);
      iframeDocument = getItemDOMLocation();
      checkProgress(weeklyLearnObj);
    }
  });
})();
