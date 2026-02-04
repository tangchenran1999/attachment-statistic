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
    // eslint-disable-next-line no-console
    console.log('1111', )
    // 如果你想阻止默认下载行为，可以：
    // event.preventDefault();
    // event.stopPropagation();
    try {
      // 或者发送埋点数据到后端
      if (String(link?.href).endsWith(".gz") && String(linkText).endsWith('.tar.gz')) {
        // 获取社区名称、话题名称、用户名、附件名称
        // const topicTitle = post?.get('topic')?.title;
        // const fileName = linkText;
        const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
        // eslint-disable-next-line no-console
        console.log('类别名称', post?.topic?.category?.name)
        if (!currentUserName) {
          return;
        }
        // // eslint-disable-next-line no-console
        // console.log('Attachment downloaded by user:', api.getCurrentUser()?.username);
        this.handleCustomDownload(event, post, link, linkText, api);
        // fetch('https://databuff.com:19090/api/saasLens/recordAttachmentDownload', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     credentials: 'same-origin',
        //   },
        //   body: JSON.stringify({
        //     communityName: 'DataLens',
        //     topicName: topicTitle,
        //     userName: currentUserName,
        //     attachmentName: fileName,
        //   }),
        // }).catch(() => {
        //   //// eslint-disable-next-line no-console
        //   // console.error('Error recording attachment download:', error);
        //   // 无返回值处理
        // });
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
    fetch(`https://databuff.com/officeApi/saasLens/downloadAttachment`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communityName: post?.topic?.category?.name || 'Default',
        topicName: topicTitle,
        userName: currentUserName,
        attachmentName: fileName,
      })
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      };
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json().then(json => { throw new Error(json.message || '下载失败'); });
      }
      return response.blob().then(blob => ({ blob, response }));
    }).then(({ blob, response }) => {
      const disposition = response.headers.get('content-disposition');
      let _fileName = 'downloaded_file';
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
        if (match && match[1]) {
          _fileName = decodeURIComponent(match[1].replace(/\"/g, ''));
        }
      }
      const createObjectURL = (object) => (window.URL) ? window.URL.createObjectURL(object)
        : window.webkitURL.createObjectURL(object)
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, _fileName)
      } else {
        const a = document.createElement('a')
        const url = createObjectURL(blob)
        a.style.display = 'none'
        a.href = url
        a.download = _fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(err?.message || '下载失败')
    })
  }
};
