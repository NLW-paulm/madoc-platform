<?php

namespace ElucidateModule\Subscriber;

use Elucidate\ClientInterface;
use Elucidate\Model\Container;
use ElucidateModule\Mapping\AnnotationBuilder;
use GuzzleHttp\Exception\RequestException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\EventDispatcher\GenericEvent;

class TaggingSubscriber implements EventSubscriberInterface
{
    private $elucidate;
    private $elucidateEndpoint;

    public function __construct(string $elucidateEndpoint, ClientInterface $elucidate)
    {
        $this->elucidate = $elucidate;
        $this->elucidateEndpoint = $elucidateEndpoint;
    }

    public static function getSubscribedEvents()
    {
        return [
            'content.tagging' => ['importTag'],
        ];
    }

    public function getIdFromSubject($subject)
    {
        return $this->elucidateEndpoint.md5($subject).'/';
    }

    public function importTag(GenericEvent $event)
    {
        $subject = $event->getSubject();
        try {
            $container = $this->elucidate->getContainer($this->getIdFromSubject($subject['subject']));
        } catch (RequestException $e) {
            $container = $this->elucidate->createContainer(
                (new Container())->setHeaders([
                    'Slug' => md5($subject['subject']),
                ])
            );
        }

        $annotation = (new AnnotationBuilder())
            ->withContainer($container)
            ->withSubject($subject['subject'])
            ->withTag($subject['tag'], $subject['tagLabel'] ?? null)
            ->withMotivation('tagging')
        ;

        if (isset($subject['part-of']) && $subject['part-of']) {
            $annotation->withSubjectPartOf($subject['part-of']);
        }

        $annotation = $this->elucidate->createAnnotation($annotation->build());
        $event->setArgument('annotation', $annotation['id']);
    }
}
