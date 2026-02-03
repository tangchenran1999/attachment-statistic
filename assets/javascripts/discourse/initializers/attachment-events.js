import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "attachment-click-handler",

  initialize() {
    withPluginApi((api) => {
      
      // decorateCookedElement 会在每个 .cooked 容器渲染后执行
      api.decorateCookedElement((postElement, helper) => {
        // postElement 是当前渲染的 HTML 容器
        // helper 可以获取当前帖子的相关信息 (如 helper.getModel() 获取 post 实例)
        const post = helper.getModel() || {};

        // 查找该容器下所有的 a 链接，并过滤出附件是'.tar.gz' 的链接
        const attachments = Array.from(postElement.querySelectorAll("a")).filter(link => {
          // TODO 增加准确的下载地址判断
          return String(link?.href).endsWith(".tar.gz") && String(link.innerText || link.innerHTML).endsWith('.tar.gz');
        });

        attachments.forEach((link) => {
          // 检查是否已经绑定过，防止重复绑定（Discourse 某些情况下会多次渲染）
          if (link.dataset.clickBound) {
            return;
          };
          link.addEventListener("click", (event) => {
            // 在这里编写你的逻辑
            event.preventDefault();
            event.stopPropagation();
            this.handleAttachmentClick(event, post, link, link.innerText || link.innerHTML, api);
          });

          // 标记已绑定
          link.dataset.clickBound = "true";
        });
      });
    });
  },

  handleAttachmentClick(event, post, link, linkText, api) {

    try {
      // 如果链接以 .tar.gz 结尾
      if (String(link?.href).endsWith(".gz") && String(linkText).endsWith('.tar.gz')) {
        const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
        if (!currentUserName) {
          return;
        }
        this.handleCustomDownload(event, post, link, linkText, api);
        return;
      }
    } catch {
      // 无返回值处理
      return;
    }
  },

  handleCustomDownload(event, post, link, linkText, api) {
    // 获取社区名称、话题名称、用户名、附件名称
    const topicTitle = post?.get('topic')?.title;
    const fileName = linkText;
    const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
    if (!currentUserName) {
      return;
    }

    // 发送下载请求
    fetch(`https://databuff.com/officeApi/saasLens/downloadAttachment`, {
      method: 'POST', // 确保后端支持 POST 请求
      headers: {
        'Content-Type': 'application/json',
        'credentials': 'same-origin', // 使用相同源的 cookies
      },
      body: JSON.stringify({
        communityName: 'DataLens',
        topicName: topicTitle,
        userName: currentUserName,
        attachmentName: fileName,
      })
    })
    .then(response => {
      // 如果返回的响应是一个文件（即 blob），则进行处理
      if (response.ok) {
        return response.blob();  // 获取二进制数据
      }
      return response.json(); // 如果不是文件，尝试处理为 JSON 错误信息
    })
    .then((data) => {
      // 如果返回的是 JSON 格式的错误消息
      if (data && data.type !== 'application/octet-stream') {
        try {
          const reader = new FileReader();
          reader.readAsText(data, 'utf-8');
          reader.onload = () => {
            const _rst = JSON.parse(reader.result) || {};
            console.warn(_rst?.message || '下载失败');
          };
        } catch {
          console.warn('下载失败');
        }
        return;
      }

      // 处理文件下载
      const _fileName = decodeURIComponent(String(response.headers.get('Content-Disposition')?.split('=')[1])).replace(/\"/g, '');
      const blob = new Blob([data]);
      const createObjectURL = (object) => (window.URL ? window.URL.createObjectURL(object) : window.webkitURL.createObjectURL(object));

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, _fileName);
      } else {
        const a = document.createElement('a');
        const url = createObjectURL(blob);
        a.style.display = 'none';
        a.href = url;
        a.download = _fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    })
    .catch((err) => {
      console.warn(err?.message || '下载失败');
    });
  }
};
