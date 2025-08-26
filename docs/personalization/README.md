Sparq Personalization Configs

Drop finalized JSON specs from your content tasks here. The app can read these at runtime (server routes) to compute flags and adapt copy.

Expected files:

- attachment_quiz.json           # Task 1 output (attachment quiz content + scoring schema)
- love_language_quiz.json        # Task 1 output (love language quick sort + scoring)
- copy_flags_rules.json          # Task 2 output (rules DSL to compute copy flags)
- cq_variants_v1.json            # Task 3 output (CQ base + variants + overlays)
- ui_strings.en-US.json          # Task 4 output (i18n microcopy)
- analytics_spec.json            # Task 5 output (events catalog)

Notes
- Keep JSON minified or pretty – loader accepts both.
- Version keys should match the docs you produce.
- The rules engine will look specifically for copy_flags_rules.json.

