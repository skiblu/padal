module Jekyll
  class LanguagePagesGenerator < Generator
    safe false
    priority :low

    def generate(site)
      cloned_pages = []

      site.pages.each do |page|
        next unless cloneable_page?(page)

        page.data['lang'] ||= 'ta'

        cloned_page = clone_page_for_language(site, page, 'en')
        cloned_pages << cloned_page if cloned_page
      end

      site.pages.concat(cloned_pages)
    end

    private

    def cloneable_page?(page)
      markdown_page?(page) && page.path != 'README.md'
    end

    def markdown_page?(page)
      File.extname(page.path) == '.md'
    end

    def content_page?(page)
      page.path.start_with?('content/') && File.extname(page.path) == '.md'
    end

    def clone_page_for_language(site, page, lang)
      clone = PageWithoutAFile.new(site, site.source, File.dirname(page.path), File.basename(page.path))
      clone.instance_variable_set(:@content, page.content)
      clone.instance_variable_set(:@data, deep_copy(page.data))
      clone.data['lang'] = lang
      clone.data['permalink'] = language_permalink(page, lang)
      clone
    rescue StandardError => e
      Jekyll.logger.warn 'LanguagePagesGenerator:', "skipping #{page.path} (#{e.message})"
      nil
    end

    def language_permalink(page, lang)
      source_path = page.path

      if content_page?(page)
        relative_path = source_path.sub(%r{\Acontent/}, '')
        directory = File.dirname(relative_path)
        file_name = File.basename(relative_path, '.md') + '.html'

        if directory == '.'
          "/content/#{lang}/#{file_name}"
        else
          "/content/#{directory}/#{lang}/#{file_name}"
        end
      else
        original_url = page.url || '/'
        original_url == '/' ? "/#{lang}/" : "/#{lang}#{original_url}"
      end
    end

    def deep_copy(object)
      Marshal.load(Marshal.dump(object))
    rescue TypeError
      object.dup
    end
  end
end