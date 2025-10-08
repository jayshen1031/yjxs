/**
 * Markdown处理工具
 * 为记录内容提供自动Markdown格式化支持
 */

class MarkdownHelper {
  
  /**
   * 自动格式化内容为Markdown
   * @param {string} content 用户输入的原始内容
   * @returns {string} 格式化后的内容
   */
  static autoFormat(content) {
    if (!content || typeof content !== 'string') {
      return content
    }

    let formatted = content
    
    // 1. 自动识别列表项（- 或 * 开头）
    formatted = formatted.replace(/^[\s]*[-*]\s+(.+)$/gm, '• $1')
    
    // 2. 自动识别有序列表
    formatted = formatted.replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '$1. $2')
    
    // 3. 自动识别标题（# 开头）
    formatted = formatted.replace(/^#+\s*(.+)$/gm, (match, title) => {
      const level = match.match(/^#+/)[0].length
      return '# '.repeat(Math.min(level, 3)) + title.trim()
    })
    
    // 4. 保持现有的粗体和斜体格式
    // **粗体** 和 *斜体* 保持不变
    
    // 5. 自动识别简单的分隔线
    formatted = formatted.replace(/^[\s]*[-]{3,}[\s]*$/gm, '---')
    
    return formatted
  }

  /**
   * 转换为Notion Rich Text格式
   * @param {string} content Markdown内容
   * @returns {Array} Notion rich_text数组
   */
  static convertToNotionRichText(content) {
    if (!content) {
      return [{ text: { content: '' } }]
    }

    const richTextBlocks = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        // 空行处理
        richTextBlocks.push({ text: { content: '\n' } })
        return
      }

      // 检查是否是标题
      const headerMatch = line.match(/^(#+)\s*(.+)$/)
      if (headerMatch) {
        richTextBlocks.push({
          text: {
            content: headerMatch[2].trim()
          },
          annotations: {
            bold: true,
            color: 'blue'
          }
        })
        if (index < lines.length - 1) {
          richTextBlocks.push({ text: { content: '\n' } })
        }
        return
      }

      // 检查是否是列表项
      const listMatch = line.match(/^[\s]*[•\-*]\s*(.+)$/) || line.match(/^[\s]*(\d+)\.\s*(.+)$/)
      if (listMatch) {
        richTextBlocks.push({
          text: {
            content: listMatch[listMatch.length - 1].trim()
          },
          annotations: {
            color: 'default'
          }
        })
        if (index < lines.length - 1) {
          richTextBlocks.push({ text: { content: '\n' } })
        }
        return
      }

      // 处理内联格式（粗体、斜体）
      const processedLine = this.processInlineFormatting(line)
      richTextBlocks.push(...processedLine)
      
      if (index < lines.length - 1) {
        richTextBlocks.push({ text: { content: '\n' } })
      }
    })

    return richTextBlocks.length > 0 ? richTextBlocks : [{ text: { content: content } }]
  }

  /**
   * 处理内联格式（粗体、斜体）
   * @param {string} line 单行文本
   * @returns {Array} 处理后的rich text块
   */
  static processInlineFormatting(line) {
    const result = []
    let currentPos = 0
    
    // 匹配 **粗体** 和 *斜体*
    const formatRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g
    let match
    
    while ((match = formatRegex.exec(line)) !== null) {
      // 添加格式前的普通文本
      if (match.index > currentPos) {
        result.push({
          text: { content: line.slice(currentPos, match.index) }
        })
      }
      
      // 添加格式化文本
      if (match[1]) {
        // 粗体 **text**
        result.push({
          text: { content: match[2] },
          annotations: { bold: true }
        })
      } else if (match[3]) {
        // 斜体 *text*
        result.push({
          text: { content: match[4] },
          annotations: { italic: true }
        })
      }
      
      currentPos = match.index + match[0].length
    }
    
    // 添加剩余的普通文本
    if (currentPos < line.length) {
      result.push({
        text: { content: line.slice(currentPos) }
      })
    }
    
    // 如果没有任何格式，返回普通文本
    return result.length > 0 ? result : [{ text: { content: line } }]
  }

  /**
   * 从Notion Rich Text转换回普通文本
   * @param {Array} richTextArray Notion rich_text数组
   * @returns {string} 普通文本
   */
  static convertFromNotionRichText(richTextArray) {
    if (!richTextArray || !Array.isArray(richTextArray)) {
      return ''
    }

    return richTextArray.map(block => {
      let text = block.text?.content || ''
      
      // 根据annotations重建Markdown格式
      if (block.annotations) {
        if (block.annotations.bold && block.annotations.italic) {
          text = `***${text}***`
        } else if (block.annotations.bold) {
          text = `**${text}**`
        } else if (block.annotations.italic) {
          text = `*${text}*`
        }
      }
      
      return text
    }).join('')
  }

  /**
   * 预览格式化效果（用于UI显示）
   * @param {string} content 原始内容
   * @returns {string} HTML预览内容
   */
  static previewFormatted(content) {
    if (!content) return ''
    
    let html = content
    
    // 转换标题
    html = html.replace(/^(#+)\s*(.+)$/gm, (match, hashes, title) => {
      const level = Math.min(hashes.length, 3)
      return `<h${level}>${title.trim()}</h${level}>`
    })
    
    // 转换列表
    html = html.replace(/^[\s]*[•\-*]\s*(.+)$/gm, '<li>$1</li>')
    html = html.replace(/^[\s]*(\d+)\.\s*(.+)$/gm, '<li>$2</li>')
    
    // 转换粗体和斜体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    
    // 转换换行
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  /**
   * 智能建议Markdown格式
   * @param {string} content 用户输入内容
   * @returns {Array} 格式建议数组
   */
  static suggestFormatting(content) {
    if (!content) return []
    
    const suggestions = []
    
    // 检查是否可能是列表
    const lines = content.split('\n')
    const listLikeLines = lines.filter(line => 
      line.match(/^[\s]*\d+[\s]*[.)]/) || 
      line.match(/^[\s]*[-*•]/) ||
      line.trim().startsWith('- ') ||
      line.trim().startsWith('* ')
    )
    
    if (listLikeLines.length > 1) {
      suggestions.push({
        type: 'list',
        message: '检测到列表格式，已自动优化显示'
      })
    }
    
    // 检查是否可能是标题
    const titleLikeLines = lines.filter(line => 
      line.match(/^#+\s/) || 
      (line.length < 50 && line.trim().length > 0 && !line.includes('。'))
    )
    
    if (titleLikeLines.length > 0) {
      suggestions.push({
        type: 'title',
        message: '可以在行首添加 # 来创建标题'
      })
    }
    
    return suggestions
  }
}

module.exports = MarkdownHelper